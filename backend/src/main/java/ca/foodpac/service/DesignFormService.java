package ca.foodpac.service;

import ca.foodpac.entity.DesignJob;
import ca.foodpac.entity.DesignJobItem;
import ca.foodpac.entity.User;
import ca.foodpac.repository.DesignJobItemRepository;
import ca.foodpac.repository.DesignJobRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Orchestrates form-based design generation:
 * upload storage, guest limits, async job execution (brand spec → 6 mockups).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DesignFormService {

    public static final Path STORAGE_DIR = Path.of(
            System.getenv().getOrDefault("DESIGN_STORAGE_DIR", "/data/design"));

    private final DesignJobRepository jobRepo;
    private final DesignJobItemRepository itemRepo;
    private final BrandSpecService brandSpecService;
    private final MockupRenderer renderer;
    private final AiImageService aiImageService;
    private final ObjectMapper mapper = new ObjectMapper();

    /** Template set used for legacy (no-style) generation. */
    private static final String TEMPLATE_SET = "default";

    /** Style-template library, bind-mounted from frontend/assets/styles. */
    public static final Path STYLES_DIR = Path.of(
            System.getenv().getOrDefault("DESIGN_STYLES_DIR", "/data/styles"));

    /** One generated image per part of the selected style group. */
    private record StylePart(String part, String cellId, String label, String cartType, String size) {}
    private static final java.util.List<StylePart> STYLE_PARTS = java.util.List.of(
            new StylePart("box",    "hero-box", "Takeout Box", "BOX", "1024x1024"),
            new StylePart("cup",    "hero-cup", "Paper Cup",   "CUP", "1024x1024"),
            new StylePart("bag",    "hero-bag", "Paper Bag",   "BAG", "1024x1024"),
            new StylePart("family", "hero-ai",  "Brand Set",   "BOX", "1536x1024"));

    // Two concurrent jobs; each job renders products on the shared image pool
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final ExecutorService imagePool = Executors.newFixedThreadPool(3);

    @PreDestroy
    void shutdown() { executor.shutdownNow(); imagePool.shutdownNow(); }

    // ── Uploads ────────────────────────────────────────────────────────────────

    public String storeUpload(byte[] bytes, String originalName) throws IOException {
        Files.createDirectories(STORAGE_DIR);
        String ext = "png";
        if (originalName != null) {
            String lower = originalName.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ext = "jpg";
            else if (lower.endsWith(".webp")) ext = "webp";
            else if (lower.endsWith(".svg")) ext = "svg";
        }
        String name = "up-" + UUID.randomUUID() + "." + ext;
        Files.write(STORAGE_DIR.resolve(name), bytes);
        return name;
    }

    public Path resolveFile(String name) {
        // Prevent path traversal: only serve simple filenames we created
        if (name == null || !name.matches("[a-zA-Z0-9._-]+")) return null;
        Path p = STORAGE_DIR.resolve(name).normalize();
        return p.startsWith(STORAGE_DIR) && Files.isRegularFile(p) ? p : null;
    }

    // ── Guest limit ────────────────────────────────────────────────────────────

    /** Guests get two free generations in total (hero or form); then login is required. */
    public boolean guestLimitReached(String anonToken) {
        return anonToken != null && jobRepo.countByAnonToken(anonToken) >= 2;
    }

    /** Attach all of a guest's jobs to the now-logged-in user. Returns merged count. */
    public int claimGuestJobs(User user, String anonToken) {
        if (user == null || anonToken == null) return 0;
        var jobs = jobRepo.findByAnonToken(anonToken);
        jobs.forEach(j -> { j.setUser(user); j.setAnonToken(null); });
        jobRepo.saveAll(jobs);
        return jobs.size();
    }

    // ── Design kits: one reusable brand asset per distinct brand name ─────────

    /**
     * A user's design inputs become per-brand "kits": for each distinct brand
     * name (newest first) we coalesce every field from that brand's job
     * history, newest value winning, so a hero-teaser job doesn't wipe the
     * logo/slogan captured by an earlier full-form job.
     */
    public java.util.List<Map<String, Object>> buildKits(User user, String anonToken) {
        java.util.List<DesignJob> jobs = user != null
                ? jobRepo.findByUser_IdOrderByCreatedAtDesc(user.getId())
                : anonToken == null ? java.util.List.of()
                : jobRepo.findByAnonTokenOrderByCreatedAtDesc(anonToken);
        var kits = new java.util.LinkedHashMap<String, java.util.HashMap<String, Object>>();
        for (DesignJob j : jobs) {
            if (j.getBrandText() == null || j.getBrandText().isBlank()) continue;
            String key = j.getBrandText().trim().toLowerCase();
            var kit = kits.computeIfAbsent(key, k -> {
                var m = new java.util.HashMap<String, Object>();
                m.put("brandText", j.getBrandText().trim());
                m.put("updatedAt", j.getCreatedAt());
                return m;
            });
            putIfAbsent(kit, "brandColor", j.getBrandColor());
            putIfAbsent(kit, "slogan", j.getSlogan());
            putIfAbsent(kit, "restaurantType", j.getRestaurantType());
            putIfAbsent(kit, "address", j.getAddress());
            putIfAbsent(kit, "phone", j.getPhone());
            putIfAbsent(kit, "logoFile", j.getLogoFile());
            putIfAbsent(kit, "qrFile", j.getQrFile());
            putIfAbsent(kit, "styleType", j.getStyleType());
            putIfAbsent(kit, "styleId", j.getStyleId());
        }
        return new java.util.ArrayList<>(kits.values());
    }

    private static void putIfAbsent(java.util.Map<String, Object> kit, String key, String value) {
        if (value != null && !value.isBlank() && !kit.containsKey(key)) kit.put(key, value);
    }

    // ── Job lifecycle ──────────────────────────────────────────────────────────

    public DesignJob createJob(User user, String anonToken, String brandText, String logoFile,
                               String restaurantType, String slogan, String address,
                               String phone, String qrFile, String brandColor,
                               String styleType, String styleId) {
        DesignJob job = DesignJob.builder()
                .user(user)
                .anonToken(user == null ? anonToken : null)
                .brandText(brandText).logoFile(logoFile)
                .restaurantType(restaurantType).slogan(slogan)
                .address(address).phone(phone).qrFile(qrFile)
                .brandColor(brandColor)
                .styleType(styleType).styleId(styleId)
                .status(DesignJob.Status.PENDING)
                .build();
        job = jobRepo.save(job);
        String jobId = job.getId();
        executor.submit(() -> run(jobId));
        return job;
    }

    private void run(String jobId) {
        DesignJob job = jobRepo.findById(jobId).orElse(null);
        if (job == null) return;
        if (job.getStyleId() != null) { runStyled(job); return; }
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);

            byte[] logo = readStored(job.getLogoFile());
            byte[] qr = readStored(job.getQrFile());

            var aiSpec = brandSpecService.generate(logo, job.getBrandText(),
                    job.getRestaurantType(), job.getSlogan());
            // User-chosen brand color overrides the AI-picked primary
            final var spec = job.getBrandColor() == null ? aiSpec
                    : new BrandSpecService.BrandSpec(job.getBrandColor(), aiSpec.secondary(),
                            aiSpec.panelBg(), aiSpec.textColor(), aiSpec.styleName());
            job.setBrandSpec(mapper.writeValueAsString(Map.of(
                    "primary", spec.primary(), "secondary", spec.secondary(),
                    "panelBg", spec.panelBg(), "textColor", spec.textColor(),
                    "styleName", spec.styleName())));
            jobRepo.save(job);

            Files.createDirectories(STORAGE_DIR);
            var futures = MockupRenderer.PRODUCTS.stream()
                    .map(product -> java.util.concurrent.CompletableFuture.runAsync(() -> {
                        byte[] image;
                        String ext;
                        try {
                            // AI re-brand: template photo + logo/QR → gpt-image-1
                            byte[] template = loadTemplate(product.baseImage());
                            image = aiImageService.rebrand(template, logo, qr,
                                    buildPrompt(product, spec, job));
                            ext = "png";
                        } catch (Exception aiEx) {
                            log.warn("AI image failed for {} ({}), falling back to composite",
                                    product.id(), aiEx.getMessage());
                            try {
                                image = renderer.render(product, spec, logo, job.getBrandText(),
                                        job.getSlogan(), job.getAddress(), job.getPhone(), qr);
                                ext = "jpg";
                            } catch (Exception fbEx) {
                                log.error("Fallback composite failed for {}", product.id(), fbEx);
                                return;
                            }
                        }
                        try {
                            String name = "gen-" + jobId + "-" + product.id() + "." + ext;
                            Files.write(STORAGE_DIR.resolve(name), image);
                            // Save each item as soon as it is ready → progressive polling
                            itemRepo.save(DesignJobItem.builder()
                                    .job(job)
                                    .productId(product.id())
                                    .productLabel(brandedLabel(job.getBrandText(), product.label()))
                                    .productType(product.cartType())
                                    .imageUrl("/api/v1/design/files/" + name)
                                    .build());
                        } catch (Exception saveEx) {
                            log.error("Saving result failed for {}", product.id(), saveEx);
                        }
                    }, imagePool))
                    .toArray(java.util.concurrent.CompletableFuture[]::new);
            java.util.concurrent.CompletableFuture.allOf(futures).join();

            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Design job {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    // ── Homepage hero brand-swap (logo-only re-render of the 4 hero photos) ───

    public record HeroTemplate(String id, String file, String label, String cartType) {}
    public static final java.util.List<HeroTemplate> HERO_TEMPLATES = java.util.List.of(
            new HeroTemplate("hero-box", "hero-box.jpg", "Kraft Takeout Box", "BOX"),
            new HeroTemplate("hero-cup", "hero-cup.jpg", "Hot Drink Cup",     "CUP"),
            new HeroTemplate("hero-bag", "hero-bag.jpg", "Kraft Paper Bag",   "BAG"),
            new HeroTemplate("hero-ai",  "hero-ai.jpg",  "Brand Set",         "BOX"));

    public DesignJob createHeroJob(User user, String anonToken, String brandText, String color,
                                   String styleType, String styleId) {
        DesignJob job = DesignJob.builder()
                .user(user)
                .anonToken(user == null ? anonToken : null)
                .kind("HERO")
                .brandText(brandText)
                .brandColor(color)
                .styleType(styleType).styleId(styleId)
                .status(DesignJob.Status.PENDING)
                .build();
        job = jobRepo.save(job);
        String jobId = job.getId();
        executor.submit(() -> runHero(jobId));
        return job;
    }

    private void runHero(String jobId) {
        DesignJob job = jobRepo.findById(jobId).orElse(null);
        if (job == null) return;
        if (job.getStyleId() != null) { runStyled(job); return; }
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);
            Files.createDirectories(STORAGE_DIR);

            String prompt = ("The input image is a product photo of kraft food packaging printed with "
                    + "the brand \"Lunat\" (logo plus small sub-text and decorative marks). Recreate this "
                    + "EXACT photo — identical products, camera angle, composition, lighting, shadows, "
                    + "background, kraft material and textures — changing ONLY the printed ink layer on the "
                    + "packaging: replace the brand name \"Lunat\" with \"%s\" (same size, same placement, "
                    + "similar typographic style), and reprint ALL printed elements — the logo, every piece "
                    + "of small sub-text, taglines, rules and decorative marks — in a cohesive brand color "
                    + "scheme built from %s (use darker and lighter tints of that same hue for hierarchy; "
                    + "no leftover colors from the original print). Spell \"%s\" exactly. The packaging "
                    + "material color, background, products and layout must stay untouched: no new objects, "
                    + "no recoloring of the kraft paper itself, only the printed ink changes.")
                    .formatted(job.getBrandText(), job.getBrandColor(), job.getBrandText());

            var futures = HERO_TEMPLATES.stream()
                    .map(t -> java.util.concurrent.CompletableFuture.runAsync(() -> {
                        try {
                            byte[] template;
                            try (var in = getClass().getResourceAsStream("/mockups/hero/" + t.file())) {
                                if (in == null) throw new IOException("missing hero template " + t.file());
                                template = in.readAllBytes();
                            }
                            byte[] png = aiImageService.rebrand(template, null, null, prompt);
                            String name = "gen-" + jobId + "-" + t.id() + ".png";
                            Files.write(STORAGE_DIR.resolve(name), png);
                            itemRepo.save(DesignJobItem.builder()
                                    .job(job)
                                    .productId(t.id())
                                    .productLabel(brandedLabel(job.getBrandText(), t.label()))
                                    .productType(t.cartType())
                                    .imageUrl("/api/v1/design/files/" + name)
                                    .build());
                        } catch (Exception e) {
                            log.warn("Hero swap failed for {}: {}", t.id(), e.getMessage());
                        }
                    }, imagePool))
                    .toArray(java.util.concurrent.CompletableFuture[]::new);
            java.util.concurrent.CompletableFuture.allOf(futures).join();

            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Hero job {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    // ── Redesign: one more, different take on a single existing design ────────

    /**
     * Clone the source item's job inputs into a REDO job that regenerates only
     * that item's part with a "make it noticeably different" prompt. The dock
     * shows one loading slot until the single new image lands.
     */
    public DesignJob createRedesignJob(User user, String anonToken, DesignJobItem srcItem) {
        DesignJob s = srcItem.getJob();
        String part = STYLE_PARTS.stream()
                .filter(sp -> sp.cellId().equals(srcItem.getProductId()))
                .map(StylePart::part).findFirst().orElse(null);
        boolean styled = s.getStyleId() != null && part != null;
        DesignJob job = DesignJob.builder()
                .user(user)
                .anonToken(user == null ? anonToken : null)
                .kind("REDO")
                .brandText(s.getBrandText()).brandColor(s.getBrandColor())
                .logoFile(s.getLogoFile()).restaurantType(s.getRestaurantType())
                .slogan(s.getSlogan()).address(s.getAddress()).phone(s.getPhone())
                .qrFile(s.getQrFile())
                .styleType(styled ? s.getStyleType() : null)
                .styleId(styled ? s.getStyleId() : null)
                .redoPart(styled ? part : null)
                .status(DesignJob.Status.PENDING)
                .build();
        job = jobRepo.save(job);
        String jobId = job.getId();
        if (styled) {
            executor.submit(() -> {
                DesignJob j = jobRepo.findById(jobId).orElse(null);
                if (j != null) runStyled(j);
            });
        } else {
            String productId = srcItem.getProductId();
            executor.submit(() -> runLegacySingle(jobId, productId));
        }
        return job;
    }

    /** Regenerate one product of the legacy (pre-style) template set. */
    private void runLegacySingle(String jobId, String productId) {
        DesignJob job = jobRepo.findById(jobId).orElse(null);
        if (job == null) return;
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);
            var product = MockupRenderer.PRODUCTS.stream()
                    .filter(pr -> pr.id().equals(productId)).findFirst()
                    .orElseThrow(() -> new IOException("unknown product " + productId));
            byte[] logo = readStored(job.getLogoFile());
            byte[] qr = readStored(job.getQrFile());
            var aiSpec = brandSpecService.generate(logo, job.getBrandText(),
                    job.getRestaurantType(), job.getSlogan());
            final var spec = job.getBrandColor() == null ? aiSpec
                    : new BrandSpecService.BrandSpec(job.getBrandColor(), aiSpec.secondary(),
                            aiSpec.panelBg(), aiSpec.textColor(), aiSpec.styleName());
            Files.createDirectories(STORAGE_DIR);
            byte[] template = loadTemplate(product.baseImage());
            byte[] image = aiImageService.rebrand(template, logo, qr, buildPrompt(product, spec, job));
            String name = "gen-" + jobId + "-" + product.id() + ".png";
            Files.write(STORAGE_DIR.resolve(name), image);
            itemRepo.save(DesignJobItem.builder()
                    .job(job)
                    .productId(product.id())
                    .productLabel(brandedLabel(job.getBrandText(), product.label()))
                    .productType(product.cartType())
                    .imageUrl("/api/v1/design/files/" + name)
                    .build());
            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Legacy redesign {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    // ── Apply a chosen design to one product photo (detail-page "image 2") ────

    public static final Path PRODUCT_IMG_DIR = Path.of(
            System.getenv().getOrDefault("PRODUCT_IMG_DIR", "/data/product-images"));

    /** Validated product photo path (prod-*.jpg shipped with the frontend). */
    public static Path productImagePath(String name) throws IOException {
        if (name == null || !name.matches("prod-[a-z0-9-]{1,60}\\.(jpg|png)"))
            throw new IOException("bad product image");
        Path p = PRODUCT_IMG_DIR.resolve(name).normalize();
        if (!p.startsWith(PRODUCT_IMG_DIR) || !Files.isRegularFile(p))
            throw new IOException("missing product image " + name);
        return p;
    }

    /**
     * Repaint one product photo with the brand identity of an existing design.
     * Produces a single item; the detail page shows it as "image 2" next to
     * the original photo (repeat calls simply produce a fresh item).
     */
    public DesignJob createApplyJob(User user, String anonToken, DesignJobItem srcItem,
                                    String productImage, String productLabel, String cartType) {
        DesignJob job = DesignJob.builder()
                .user(user)
                .anonToken(user == null ? anonToken : null)
                .kind("APPLY")
                .brandText(srcItem.getJob().getBrandText())
                .status(DesignJob.Status.PENDING)
                .build();
        job = jobRepo.save(job);
        String jobId = job.getId();
        String srcFile = srcItem.getImageUrl().substring(srcItem.getImageUrl().lastIndexOf('/') + 1);
        executor.submit(() -> runApply(jobId, srcFile, productImage, productLabel, cartType));
        return job;
    }

    private void runApply(String jobId, String srcFile, String productImage,
                          String productLabel, String cartType) {
        DesignJob job = jobRepo.findById(jobId).orElse(null);
        if (job == null) return;
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);
            Files.createDirectories(STORAGE_DIR);

            byte[] template = Files.readAllBytes(productImagePath(productImage));
            byte[] ref = readStored(srcFile);
            if (ref == null) throw new IOException("missing source design " + srcFile);

            String brand = job.getBrandText();
            String prompt = ("The FIRST image is the official product photo of our " + productLabel
                    + " — this is the EXACT physical item that will be manufactured, so the product "
                    + "itself must NOT be modified in any way: keep its geometry, proportions, "
                    + "die-line, folds, lid, handles, closures, material, surface texture, finish, "
                    + "camera angle, framing, lighting, shadows and background pixel-faithful to the "
                    + "first image. The SECOND image is ONLY a graphic style reference — ignore the "
                    + "product shown in it entirely; do NOT copy its shape, form factor or scene. "
                    + "Your ONLY change: transfer the printed artwork style from the second image "
                    + "onto the first product's printable surfaces — the same brand name"
                    + (brand != null ? " (\"" + brand + "\" — spell it EXACTLY)" : " (spell it exactly as shown)")
                    + ", color palette, typography, patterns, borders and logo treatment, re-laid-out "
                    + "naturally for this product's own panels. If an element from the reference does "
                    + "not fit this product's surfaces, omit it rather than altering the product. "
                    + "No other brand names, no watermarks, nothing added to or removed from the scene.");

            byte[] png = aiImageService.rebrand(template, ref, null, prompt);
            String name = "gen-" + jobId + "-apply.png";
            Files.write(STORAGE_DIR.resolve(name), png);
            itemRepo.save(DesignJobItem.builder()
                    .job(job)
                    .productId("apply")
                    .productLabel(brandedLabel(brand, productLabel))
                    .productType(cartType)
                    .imageUrl("/api/v1/design/files/" + name)
                    .build());
            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Apply job {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    // ── Style-template generation (box/cup/bag/family of the chosen style) ────

    /**
     * Shared pipeline for HERO and FORM jobs that carry a style reference:
     * rebrand all four images of the selected style group. Item productIds use
     * the hero cell ids so the homepage can swap results into its four cells.
     */
    private void runStyled(DesignJob job) {
        String jobId = job.getId();
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);
            Files.createDirectories(STORAGE_DIR);

            byte[] logo = readStored(job.getLogoFile());
            byte[] qr = readStored(job.getQrFile());

            var parts = job.getRedoPart() == null ? STYLE_PARTS
                    : STYLE_PARTS.stream().filter(sp -> sp.part().equals(job.getRedoPart())).toList();
            var futures = parts.stream()
                    .map(part -> java.util.concurrent.CompletableFuture.runAsync(() -> {
                        try {
                            byte[] template = Files.readAllBytes(
                                    styleTemplatePath(job.getStyleType(), job.getStyleId(), part.part()));
                            byte[] png = aiImageService.rebrand(template, logo, qr,
                                    buildStyledPrompt(job, part.part()), part.size());
                            String name = "gen-" + jobId + "-" + part.cellId() + ".png";
                            Files.write(STORAGE_DIR.resolve(name), png);
                            itemRepo.save(DesignJobItem.builder()
                                    .job(job)
                                    .productId(part.cellId())
                                    .productLabel(brandedLabel(job.getBrandText(), part.label()))
                                    .productType(part.cartType())
                                    .imageUrl("/api/v1/design/files/" + name)
                                    .build());
                        } catch (Exception e) {
                            log.warn("Styled generation failed for {} {}: {}",
                                    job.getStyleId(), part.part(), e.getMessage());
                        }
                    }, imagePool))
                    .toArray(java.util.concurrent.CompletableFuture[]::new);
            java.util.concurrent.CompletableFuture.allOf(futures).join();

            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Styled job {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    /** Validated path into the mounted style library; rejects traversal tokens. */
    public static Path styleTemplatePath(String type, String id, String part) throws IOException {
        if (type == null || id == null
                || !type.matches("[a-z0-9-]{1,40}") || !id.matches("[a-z0-9-]{1,40}"))
            throw new IOException("bad style reference");
        Path p = STYLES_DIR.resolve(type).resolve(id + "-" + part + ".jpg").normalize();
        if (!p.startsWith(STYLES_DIR) || !Files.isRegularFile(p))
            throw new IOException("missing style template " + type + "/" + id + "-" + part);
        return p;
    }

    /** Does the referenced style group exist in the mounted library? */
    public boolean styleExists(String type, String id) {
        try { styleTemplatePath(type, id, "family"); return true; }
        catch (IOException e) { return false; }
    }

    /**
     * The style photos are fully designed "Lunat" packaging: keep the design,
     * swap the brand, and (when a color is chosen) shift the whole printed
     * scheme to that hue. Secondary info (slogan/contact/QR) is placed where
     * the piece has room for it — per-part guidance below — and the model is
     * told to drop the least important elements rather than crowd a small
     * surface (e.g. a chopstick sleeve can carry the brand name only).
     */
    private static final Map<String, String> PART_INFO_GUIDE = Map.of(
            "box", "This box has generous printable panels: the slogan sits below or beside the brand "
                 + "name; the contact line and QR code go on a secondary panel or near the bottom edge. ",
            "cup", "This cup has a medium printable surface: the slogan can sit under the brand name; "
                 + "the contact line goes in very small type near the bottom rim; include the QR code "
                 + "only if it fits discreetly. ",
            "bag", "This bag has a large front panel: the slogan sits under the brand name; the contact "
                 + "line and QR code go near the bottom edge or on the side gusset. ",
            "family", "Apply the same extended layout to each piece according to its size: larger pieces "
                 + "(bag, box) may carry the slogan and contact line, smaller pieces show fewer "
                 + "elements. The set must stay visually consistent. ");

    private String buildStyledPrompt(DesignJob job, String part) {
        String brand = job.getBrandText();
        boolean redo = "REDO".equals(job.getKind());
        StringBuilder p = new StringBuilder();
        p.append("The input image is a professional product photo of food packaging printed with the ")
         .append("brand \"Lunat\". Recreate this photo — identical products, camera angle, ")
         .append("composition, lighting, shadows, background, props, materials and textures — ");
        if (redo)
            p.append("but REDESIGN the packaging's printed artwork as a noticeably DIFFERENT variation ")
             .append("in the same style family: replace the brand name \"Lunat\" with \"").append(brand)
             .append("\" and rearrange or restyle the lettering, motifs, borders and decorative ")
             .append("elements so the print design clearly differs from the reference while staying ")
             .append("professional and stylistically related. ");
        else
            p.append("changing ONLY the packaging's printed artwork: replace the brand name \"Lunat\" ")
             .append("with \"").append(brand)
             .append("\" (same placement, same typographic style, same size), keeping every ")
             .append("decorative pattern, motif, border and the overall layout of the printed design. ");
        if (job.getBrandColor() != null)
            p.append("Shift the packaging's brand color scheme — colored panels, coatings, lettering, ")
             .append("patterns and marks — to a cohesive scheme built from ").append(job.getBrandColor())
             .append(", using darker and lighter tints of that hue for hierarchy; natural materials ")
             .append("(kraft paper, white paper base, wood, stone, food) and the scene background keep ")
             .append("their original colors. ");
        if (job.getLogoFile() != null)
            p.append("The SECOND input image is the brand logo — print it faithfully where the main ")
             .append("logo sits. ");

        String contact = java.util.stream.Stream.of(job.getPhone(), job.getAddress())
                .filter(s -> s != null && !s.isBlank())
                .collect(java.util.stream.Collectors.joining(" · "));
        boolean hasExtras = job.getSlogan() != null || !contact.isBlank() || job.getQrFile() != null;
        if (hasExtras) {
            p.append("Additionally, integrate the following brand information into the printed design, ")
             .append("in the SAME typographic language as the style (matching fonts, colors and ")
             .append("alignment), keeping a clear hierarchy — brand name dominant, slogan secondary, ")
             .append("contact details and QR code smallest: ");
            if (job.getSlogan() != null)
                p.append("slogan \"").append(job.getSlogan()).append("\"; ");
            if (!contact.isBlank())
                p.append("contact line \"").append(contact).append("\"; ");
            if (job.getQrFile() != null)
                p.append("the ").append(job.getLogoFile() != null ? "THIRD" : "SECOND")
                 .append(" input image is a QR code to print as-is (scannable, on a light background); ");
            p.append(". ").append(PART_INFO_GUIDE.getOrDefault(part, ""));
            p.append("Placement must look like real professional packaging print. If this surface is ")
             .append("too small or the composition would become cluttered, omit elements in this order ")
             .append("rather than crowding the design: first the QR code, then the contact line, then ")
             .append("the slogan. Never shrink or displace the main brand name to make room. ");
        }
        p.append("Spell \"").append(brand)
         .append("\" exactly. No other brand names, no watermarks, no new objects.");
        return p.toString();
    }

    /** "Kongfu" + "Kraft Takeout Box" → "Kongfu Kraft Takeout Box" */
    private static String brandedLabel(String brand, String label) {
        return brand == null || brand.isBlank() ? label : brand.trim() + " " + label;
    }

    private byte[] loadTemplate(String fileName) throws IOException {
        try (var in = getClass().getResourceAsStream("/mockups/" + TEMPLATE_SET + "/" + fileName)) {
            if (in == null) throw new IOException("Missing template: " + TEMPLATE_SET + "/" + fileName);
            return in.readAllBytes();
        }
    }

    /** One shared brand brief per job keeps all six mockups stylistically consistent. */
    private String buildPrompt(MockupRenderer.Product product,
                               BrandSpecService.BrandSpec spec, DesignJob job) {
        StringBuilder p = new StringBuilder();
        p.append("Photorealistic packaging mockup. The FIRST input image is the template photo of a ")
         .append(product.label().toLowerCase())
         .append(". Recreate this exact photo — identical camera angle, composition, product shape, ")
         .append("material, lighting, shadows and background — but REPLACE all existing printed ")
         .append("branding, logos and text on the packaging with the new brand identity: ");
        if (job.getLogoFile() != null)
            p.append("the SECOND input image is the brand logo — reproduce it faithfully as the ")
             .append("main printed logo. ");
        if (job.getBrandText() != null)
            p.append("Brand name: \"").append(job.getBrandText()).append("\". ");
        if (job.getSlogan() != null)
            p.append("Slogan (print smaller, near the brand): \"").append(job.getSlogan()).append("\". ");
        String contact = java.util.stream.Stream.of(job.getPhone(), job.getAddress())
                .filter(s -> s != null && !s.isBlank())
                .collect(java.util.stream.Collectors.joining(" · "));
        if (!contact.isBlank())
            p.append("Contact line in small print: \"").append(contact).append("\". ");
        if (job.getQrFile() != null)
            p.append("Also print the provided QR code image on a suitable flat area of the packaging. ");
        if (job.getRestaurantType() != null)
            p.append("The restaurant serves ").append(job.getRestaurantType())
             .append(" food — let subtle motifs reflect that. ");
        p.append("Overall style: ").append(spec.styleName())
         .append("; primary color ").append(spec.primary())
         .append(", accent color ").append(spec.secondary())
         .append(". Spell every word exactly as given. Clean, professional food-packaging design. ")
         .append("No watermarks, no extra objects, nothing added to the scene.");
        return p.toString();
    }

    private byte[] readStored(String name) {
        if (name == null) return null;
        Path p = resolveFile(name);
        if (p == null) return null;
        try { return Files.readAllBytes(p); } catch (IOException e) { return null; }
    }
}
