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
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_UPLOAD_BYTES)
            return ResponseEntity.badRequest().body(Map.of("error", "File must be 1B–5MB"));
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/"))
            return ResponseEntity.badRequest().body(Map.of("error", "Only image uploads are allowed"));
        String name = service.storeUpload(file.getBytes(), file.getOriginalFilename());
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
                "createdAt", i.getCreatedAt())).toList()));
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
        DesignJob job = service.createHeroJob(user, anonToken, req.brandText().trim(), color,
                styled ? trim(req.styleType()) : null, styled ? trim(req.styleId()) : null);
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
    public ResponseEntity<byte[]> file(@PathVariable String name) throws IOException {
        Path p = service.resolveFile(name);
        if (p == null) return ResponseEntity.notFound().build();
        String lower = name.toLowerCase();
        MediaType type = lower.endsWith(".png") ? MediaType.IMAGE_PNG
                : lower.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : lower.endsWith(".svg") ? MediaType.parseMediaType("image/svg+xml")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(type)
                .header("Cache-Control", "public, max-age=86400")
                .body(Files.readAllBytes(p));
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
