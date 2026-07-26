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

    /** Template set used for generation; more sets can be added later. */
    private static final String TEMPLATE_SET = "default";

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

    /** Guests get one free generation; after that login is required. */
    public boolean guestLimitReached(String anonToken) {
        return anonToken != null && jobRepo.countByAnonToken(anonToken) >= 1;
    }

    // ── Job lifecycle ──────────────────────────────────────────────────────────

    public DesignJob createJob(User user, String anonToken, String brandText, String logoFile,
                               String restaurantType, String slogan, String address,
                               String phone, String qrFile) {
        DesignJob job = DesignJob.builder()
                .user(user)
                .anonToken(user == null ? anonToken : null)
                .brandText(brandText).logoFile(logoFile)
                .restaurantType(restaurantType).slogan(slogan)
                .address(address).phone(phone).qrFile(qrFile)
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
        try {
            job.setStatus(DesignJob.Status.RUNNING);
            jobRepo.save(job);

            byte[] logo = readStored(job.getLogoFile());
            byte[] qr = readStored(job.getQrFile());

            var spec = brandSpecService.generate(logo, job.getBrandText(),
                    job.getRestaurantType(), job.getSlogan());
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
                                    .productLabel(product.label())
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
