package ca.foodpac.config;

import ca.foodpac.entity.ProductTypeConfig;
import ca.foodpac.entity.SizeOption;
import ca.foodpac.repository.ProductTypeConfigRepository;
import ca.foodpac.repository.SizeOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds product types and sizes on first boot (idempotent — skips if data already present).
 * Update these records via the database directly when the catalog changes.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final ProductTypeConfigRepository typeRepo;
    private final SizeOptionRepository        sizeRepo;

    @Override
    public void run(ApplicationArguments args) {
        if (typeRepo.count() > 0) return;   // already seeded

        // ── Product types ───────────────────────────────────────────
        var types = List.of(
            new ProductTypeConfig("BOX",   "Takeout Box",      1),
            new ProductTypeConfig("CUP",   "Cup & Lid",        2),
            new ProductTypeConfig("BAG",   "Paper Bag",        3),
            new ProductTypeConfig("BOWL",  "Bowl & Container", 4),
            new ProductTypeConfig("POUCH", "Stand-up Pouch",   5),
            new ProductTypeConfig("WRAP",  "Wrapping Paper",   6)
        );
        typeRepo.saveAll(types);

        // ── Sizes per type ──────────────────────────────────────────
        var sizes = List.of(
            // BOX
            SizeOption.builder().productTypeKey("BOX").label("Small (100×100×50mm)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("BOX").label("Medium (150×150×70mm)").sortOrder(2).build(),
            SizeOption.builder().productTypeKey("BOX").label("Large (200×200×90mm)").sortOrder(3).build(),
            SizeOption.builder().productTypeKey("BOX").label("XL (250×200×100mm)").sortOrder(4).build(),
            // CUP
            SizeOption.builder().productTypeKey("CUP").label("8 oz (80×90mm)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("CUP").label("12 oz (90×105mm)").sortOrder(2).build(),
            SizeOption.builder().productTypeKey("CUP").label("16 oz (95×115mm)").sortOrder(3).build(),
            SizeOption.builder().productTypeKey("CUP").label("20 oz (95×130mm)").sortOrder(4).build(),
            // BAG
            SizeOption.builder().productTypeKey("BAG").label("Small (150×80×250mm)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("BAG").label("Medium (200×100×300mm)").sortOrder(2).build(),
            SizeOption.builder().productTypeKey("BAG").label("Large (250×120×350mm)").sortOrder(3).build(),
            // BOWL
            SizeOption.builder().productTypeKey("BOWL").label("16 oz (140×45mm)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("BOWL").label("32 oz (160×55mm)").sortOrder(2).build(),
            SizeOption.builder().productTypeKey("BOWL").label("48 oz (180×65mm)").sortOrder(3).build(),
            // POUCH
            SizeOption.builder().productTypeKey("POUCH").label("Small (70×100mm)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("POUCH").label("Medium (100×150mm)").sortOrder(2).build(),
            SizeOption.builder().productTypeKey("POUCH").label("Large (150×200mm)").sortOrder(3).build(),
            // WRAP
            SizeOption.builder().productTypeKey("WRAP").label("Standard (300mm × 500m)").sortOrder(1).build(),
            SizeOption.builder().productTypeKey("WRAP").label("Large (450mm × 500m)").sortOrder(2).build()
        );
        sizeRepo.saveAll(sizes);
    }
}
