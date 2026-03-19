package ca.foodpac.repository;

import ca.foodpac.entity.ProductTypeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductTypeConfigRepository extends JpaRepository<ProductTypeConfig, String> {
    List<ProductTypeConfig> findAllByOrderByDisplayOrderAsc();
}
