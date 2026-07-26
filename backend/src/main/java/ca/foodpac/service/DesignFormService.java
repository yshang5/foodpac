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
    private final ObjectMapper mapper = new ObjectMapper();

    // Two workers: keeps memory modest on the small instance
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @PreDestroy
    void shutdown() { executor.shutdownNow(); }

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

            for (var product : MockupRenderer.PRODUCTS) {
                byte[] jpeg = renderer.render(product, spec, logo, job.getBrandText(),
                        job.getSlogan(), job.getAddress(), job.getPhone(), qr);
                String name = "gen-" + jobId + "-" + product.id() + ".jpg";
                Files.createDirectories(STORAGE_DIR);
                Files.write(STORAGE_DIR.resolve(name), jpeg);
                // Save each item as soon as it is ready → progressive polling
                itemRepo.save(DesignJobItem.builder()
                        .job(job)
                        .productId(product.id())
                        .productLabel(product.label())
                        .productType(product.cartType())
                        .imageUrl("/api/v1/design/files/" + name)
                        .build());
            }

            job.setStatus(DesignJob.Status.COMPLETED);
            jobRepo.save(job);
        } catch (Exception e) {
            log.error("Design job {} failed", jobId, e);
            job.setStatus(DesignJob.Status.FAILED);
            job.setError(e.getMessage());
            jobRepo.save(job);
        }
    }

    private byte[] readStored(String name) {
        if (name == null) return null;
        Path p = resolveFile(name);
        if (p == null) return null;
        try { return Files.readAllBytes(p); } catch (IOException e) { return null; }
    }
}
