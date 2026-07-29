package ca.foodpac.controller;

import ca.foodpac.entity.DesignJob;
import ca.foodpac.entity.User;
import ca.foodpac.repository.DesignJobItemRepository;
import ca.foodpac.repository.DesignJobRepository;
import ca.foodpac.service.DesignFormService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Form-based "Design Online" API.
 * Guests may generate once (fp_anon cookie); further generations require login.
 */
@RestController
@RequestMapping("/api/v1/design")
@RequiredArgsConstructor
public class DesignFormController {

    private static final String ANON_COOKIE = "fp_anon";
    private static final long MAX_UPLOAD_BYTES = 5L * 1024 * 1024;

    private final DesignFormService service;
    private final DesignJobRepository jobRepo;
    private final DesignJobItemRepository itemRepo;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    // ── Upload logo / QR image ────────────────────────────────────────────────

    @PostMapping("/uploads")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "kind", required = false) String kind) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_UPLOAD_BYTES)
            return ResponseEntity.badRequest().body(Map.of("error", "File must be 1B–5MB"));
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/"))
            return ResponseEntity.badRequest().body(Map.of("error", "Only image uploads are allowed"));
        byte[] bytes = file.getBytes();
        String original = file.getOriginalFilename();
        if ("logo".equals(kind)) {
            // logo 先转成去背景的透明底图（QR 等其它上传不动）
            byte[] cut = service.makeLogoTransparent(bytes);
            if (cut != bytes) { bytes = cut; original = "logo.png"; }
        }
        String name = service.storeUpload(bytes, original);
        return ResponseEntity.ok(Map.of("file", name, "url", "/api/v1/design/files/" + name));
    }

    // ── Generate ──────────────────────────────────────────────────────────────

    public record GenerateRequest(String brandText, String logoFile, String restaurantType,
                                  String slogan, String address, String phone, String qrFile,
                                  String brandColor, String styleType, String styleId) {}

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@AuthenticationPrincipal User user,
                                      @RequestBody GenerateRequest req,
                                      HttpServletRequest httpReq,
                                      HttpServletResponse httpRes) {
        boolean hasBrand = req.brandText() != null && !req.brandText().isBlank();
        boolean hasLogo = req.logoFile() != null && !req.logoFile().isBlank();
        if (!hasBrand && !hasLogo)
            return ResponseEntity.badRequest().body(Map.of("error", "Provide a brand name or upload a logo"));

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep designing — your first design is saved."));
            if (anonToken == null) {
                anonToken = UUID.randomUUID().toString();
                httpRes.addHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/; Max-Age=31536000; HttpOnly%s; SameSite=Lax",
                        ANON_COOKIE, anonToken, cookieSecure ? "; Secure" : ""));
            }
        }

        String color = req.brandColor() != null && req.brandColor().matches("#[0-9a-fA-F]{6}")
                ? req.brandColor().toLowerCase() : null;
        // Style reference is optional; silently fall back to the legacy set if unknown
        boolean styled = service.styleExists(trim(req.styleType()), trim(req.styleId()));
        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createJob(user, anonToken,
                trim(req.brandText()), trim(req.logoFile()), trim(req.restaurantType()),
                trim(req.slogan()), trim(req.address()), trim(req.phone()), trim(req.qrFile()), color,
                styled ? trim(req.styleType()) : null, styled ? trim(req.styleId()) : null);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── My Designs: full history for the current user / guest ─────────────────

    @GetMapping("/my-designs")
    public ResponseEntity<?> myDesigns(@AuthenticationPrincipal User user, HttpServletRequest httpReq) {
        List<ca.foodpac.entity.DesignJobItem> items;
        if (user != null) {
            items = itemRepo.findByJob_User_IdAndDeletedFalseOrderByCreatedAtDesc(user.getId());
        } else {
            String anonToken = readCookie(httpReq);
            items = anonToken == null ? List.of()
                    : itemRepo.findByJob_AnonTokenAndDeletedFalseOrderByCreatedAtDesc(anonToken);
        }
        return ResponseEntity.ok(Map.of("items", items.stream().map(i -> Map.of(
                "id", i.getId(),
                "productId", i.getProductId(),
                "productLabel", i.getProductLabel(),
                "productType", i.getProductType(),
                "imageUrl", i.getImageUrl(),
                // 生成时所属风格库（餐厅类型）——solution 页按此过滤"千人千面"恢复
                "styleType", i.getJob().getStyleType() == null ? "" : i.getJob().getStyleType(),
                "createdAt", i.getCreatedAt())).toList()));
    }

    // ── Design kits: saved per-brand design assets for reuse ──────────────────

    @GetMapping("/kits")
    public ResponseEntity<?> kits(@AuthenticationPrincipal User user, HttpServletRequest httpReq) {
        return ResponseEntity.ok(Map.of("kits",
                service.buildKits(user, user == null ? readCookie(httpReq) : null)));
    }

    // ── Claim guest history after login (idempotent) ──────────────────────────

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@AuthenticationPrincipal User user, HttpServletRequest httpReq) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        int merged = service.claimGuestJobs(user, readCookie(httpReq));
        return ResponseEntity.ok(Map.of("merged", merged));
    }

    // ── Homepage hero brand-swap (logo-only, cheap teaser) ────────────────────

    public record HeroSwapRequest(String brandText, String color, String styleType, String styleId) {}

    @PostMapping("/hero-swap")
    public ResponseEntity<?> heroSwap(@AuthenticationPrincipal User user,
                                      @RequestBody HeroSwapRequest req,
                                      HttpServletRequest httpReq,
                                      HttpServletResponse httpRes) {
        if (req.brandText() == null || req.brandText().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Brand name required"));
        String color = req.color() != null && req.color().matches("#[0-9a-fA-F]{6}")
                ? req.color().toLowerCase() : "#2e7d32";

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep trying brands."));
            if (anonToken == null) {
                anonToken = UUID.randomUUID().toString();
                httpRes.addHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/; Max-Age=31536000; HttpOnly%s; SameSite=Lax",
                        ANON_COOKIE, anonToken, cookieSecure ? "; Secure" : ""));
            }
        }

        boolean styled = service.styleExists(trim(req.styleType()), trim(req.styleId()));
        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createHeroJob(user, anonToken, req.brandText().trim(), color,
                styled ? trim(req.styleType()) : null, styled ? trim(req.styleId()) : null);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── Redesign: one different take on an existing design ────────────────────

    public record RedesignRequest(String itemId) {}

    @PostMapping("/redesign")
    public ResponseEntity<?> redesign(@AuthenticationPrincipal User user,
                                      @RequestBody RedesignRequest req,
                                      HttpServletRequest httpReq,
                                      HttpServletResponse httpRes) {
        var item = itemRepo.findById(req.itemId() == null ? "" : req.itemId()).orElse(null);
        if (item == null || item.isDeleted()) return ResponseEntity.notFound().build();

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep designing."));
            if (anonToken == null) {
                anonToken = UUID.randomUUID().toString();
                httpRes.addHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/; Max-Age=31536000; HttpOnly%s; SameSite=Lax",
                        ANON_COOKIE, anonToken, cookieSecure ? "; Secure" : ""));
            }
        }

        // The source item must belong to the requester — its inputs are copied
        DesignJob src = item.getJob();
        boolean owned = user != null
                ? src.getUser() != null && src.getUser().getId().equals(user.getId())
                : anonToken != null && anonToken.equals(src.getAnonToken());
        if (!owned) return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createRedesignJob(user, anonToken, item);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── Edit one design image with a user instruction ─────────────────────────

    public record EditItemRequest(String itemId, String instruction) {}

    @PostMapping("/edit-item")
    public ResponseEntity<?> editItem(@AuthenticationPrincipal User user,
                                      @RequestBody EditItemRequest req,
                                      HttpServletRequest httpReq,
                                      HttpServletResponse httpRes) {
        String instruction = req.instruction() == null ? "" : req.instruction().strip();
        if (instruction.isEmpty() || instruction.length() > 500)
            return ResponseEntity.badRequest().body(Map.of("error", "Please describe the change (max 500 chars)."));
        var item = itemRepo.findById(req.itemId() == null ? "" : req.itemId()).orElse(null);
        if (item == null || item.isDeleted()) return ResponseEntity.notFound().build();

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep designing."));
            if (anonToken == null) return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        DesignJob src = item.getJob();
        boolean owned = user != null
                ? src.getUser() != null && src.getUser().getId().equals(user.getId())
                : anonToken.equals(src.getAnonToken());
        if (!owned) return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createEditJob(user, anonToken, item, instruction);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── Apply a chosen design to a product photo (detail-page image 2) ────────

    public record ApplyRequest(String itemId, String productImage,
                               String productLabel, String productType) {}

    @PostMapping("/apply-product")
    public ResponseEntity<?> applyProduct(@AuthenticationPrincipal User user,
                                          @RequestBody ApplyRequest req,
                                          HttpServletRequest httpReq,
                                          HttpServletResponse httpRes) {
        var item = itemRepo.findById(req.itemId() == null ? "" : req.itemId()).orElse(null);
        if (item == null || item.isDeleted()) return ResponseEntity.notFound().build();
        String productImage = req.productImage() == null ? "" : req.productImage().replaceAll("\\?.*$", "");
        try {
            DesignFormService.productImagePath(productImage);
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown product image"));
        }
        String label = trim(req.productLabel());
        if (label == null || label.length() > 60)
            return ResponseEntity.badRequest().body(Map.of("error", "Bad product label"));
        String type = req.productType() != null && req.productType().matches("[A-Z]{2,10}")
                ? req.productType() : "BOX";

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep designing."));
            if (anonToken == null) {
                anonToken = UUID.randomUUID().toString();
                httpRes.addHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/; Max-Age=31536000; HttpOnly%s; SameSite=Lax",
                        ANON_COOKIE, anonToken, cookieSecure ? "; Secure" : ""));
            }
        }
        DesignJob src = item.getJob();
        boolean owned = user != null
                ? src.getUser() != null && src.getUser().getId().equals(user.getId())
                : anonToken != null && anonToken.equals(src.getAnonToken());
        if (!owned) return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createApplyJob(user, anonToken, item,
                productImage, label, type);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── Solutions: bulk apply one style+brand to a product set ────────────────

    public record BulkProduct(String image, String label, String type) {}
    public record ApplyBulkRequest(String styleType, String styleId, String brandText,
                                   String brandColor, String logoFile,
                                   List<BulkProduct> products) {}

    @PostMapping("/apply-bulk")
    public ResponseEntity<?> applyBulk(@AuthenticationPrincipal User user,
                                       @RequestBody ApplyBulkRequest req,
                                       HttpServletRequest httpReq,
                                       HttpServletResponse httpRes) {
        if (req.brandText() == null || req.brandText().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Brand name required"));
        if (!service.styleExists(trim(req.styleType()), trim(req.styleId())))
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown style"));
        if (req.products() == null || req.products().isEmpty() || req.products().size() > 12)
            return ResponseEntity.badRequest().body(Map.of("error", "1–12 products required"));

        List<String[]> products = new java.util.ArrayList<>();
        for (BulkProduct p : req.products()) {
            String img = p.image() == null ? "" : p.image().replaceAll("\\?.*$", "");
            try {
                DesignFormService.productImagePath(img);
            } catch (IOException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Unknown product image " + p.image()));
            }
            String label = trim(p.label());
            if (label == null || label.length() > 60)
                return ResponseEntity.badRequest().body(Map.of("error", "Bad product label"));
            String type = p.type() != null && p.type().matches("[A-Z]{2,10}") ? p.type() : "BOX";
            products.add(new String[]{ img, label, type });
        }
        String color = req.brandColor() != null && req.brandColor().matches("#[0-9a-fA-F]{6}")
                ? req.brandColor().toLowerCase() : null;

        String anonToken = null;
        if (user == null) {
            anonToken = readCookie(httpReq);
            if (anonToken != null && service.guestLimitReached(anonToken))
                return ResponseEntity.status(401).body(Map.of("error", "LOGIN_REQUIRED",
                        "message", "Sign in to keep designing."));
            if (anonToken == null) {
                anonToken = UUID.randomUUID().toString();
                httpRes.addHeader("Set-Cookie", String.format(
                        "%s=%s; Path=/; Max-Age=31536000; HttpOnly%s; SameSite=Lax",
                        ANON_COOKIE, anonToken, cookieSecure ? "; Secure" : ""));
            }
        }
        if (service.imageLimitReached(user, anonToken)) return aiLimitResponse();
        DesignJob job = service.createBulkJob(user, anonToken, req.brandText().trim(), color,
                trim(req.logoFile()), trim(req.styleType()), trim(req.styleId()), products);
        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus().name()));
    }

    // ── Poll job progress ─────────────────────────────────────────────────────

    @GetMapping("/jobs/{id}")
    public ResponseEntity<?> job(@PathVariable String id) {
        DesignJob job = jobRepo.findById(id).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();
        List<Map<String, String>> results = itemRepo
                .findByJobIdAndDeletedFalseOrderByCreatedAtAsc(id).stream()
                .map(i -> Map.of(
                        "id", i.getId(),
                        "productId", i.getProductId(),
                        "productLabel", i.getProductLabel(),
                        "productType", i.getProductType(),
                        "imageUrl", i.getImageUrl()))
                .toList();
        return ResponseEntity.ok(Map.of(
                "jobId", job.getId(),
                "status", job.getStatus().name(),
                "error", job.getError() == null ? "" : job.getError(),
                "results", results));
    }

    // ── Delete one generated design ───────────────────────────────────────────

    @DeleteMapping("/job-items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable String id) {
        return itemRepo.findById(id).map(item -> {
            item.setDeleted(true);
            itemRepo.save(item);
            return ResponseEntity.ok(Map.of("deleted", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Serve stored images (uploads + generated) ─────────────────────────────

    @GetMapping("/files/{name}")
    public ResponseEntity<byte[]> file(@PathVariable String name,
                                       @RequestParam(value = "w", required = false) Integer w) throws IOException {
        Path p = service.resolveFile(name);
        if (p == null) return ResponseEntity.notFound().build();
        String lower = name.toLowerCase();
        // 缩略图：?w=96..640 → 服务端缩放并落盘缓存（jpg），缩略图/小图秒开
        if (w != null && w >= 32 && w <= 640 && (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg"))) {
            byte[] thumb = service.thumbnail(name, w);
            if (thumb != null)
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG)
                        .header("Cache-Control", "public, max-age=604800")
                        .body(thumb);
        }
        MediaType type = lower.endsWith(".png") ? MediaType.IMAGE_PNG
                : lower.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : lower.endsWith(".svg") ? MediaType.parseMediaType("image/svg+xml")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(type)
                .header("Cache-Control", "public, max-age=86400")
                .body(Files.readAllBytes(p));
    }

    /** AI 生成额度用尽：提示联系销售换取 designer 权限。 */
    private ResponseEntity<?> aiLimitResponse() {
        return ResponseEntity.status(402).body(Map.of(
                "error", "AI_LIMIT_REACHED",
                "message", "You've used your free AI design credits. Please contact our sales team to unlock more AI credits and keep designing.",
                "email", "hi@foodpac.ai"));
    }

    private static String readCookie(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies)
            if (ANON_COOKIE.equals(c.getName()) && !c.getValue().isBlank()) return c.getValue();
        return null;
    }

    private static String trim(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
