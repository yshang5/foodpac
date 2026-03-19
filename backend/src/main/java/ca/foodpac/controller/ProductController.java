package ca.foodpac.controller;

import ca.foodpac.entity.ProductTypeConfig;
import ca.foodpac.entity.SizeOption;
import ca.foodpac.repository.ProductTypeConfigRepository;
import ca.foodpac.repository.SizeOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductTypeConfigRepository typeRepo;
    private final SizeOptionRepository        sizeRepo;

    /** GET /api/v1/products/types */
    @GetMapping("/types")
    public ResponseEntity<List<ProductTypeConfig>> getTypes() {
        return ResponseEntity.ok(typeRepo.findAllByOrderByDisplayOrderAsc());
    }

    /** GET /api/v1/products/sizes/{typeKey} */
    @GetMapping("/sizes/{typeKey}")
    public ResponseEntity<List<SizeOption>> getSizes(@PathVariable String typeKey) {
        return ResponseEntity.ok(sizeRepo.findByProductTypeKeyOrderBySortOrderAsc(typeKey));
    }
}
