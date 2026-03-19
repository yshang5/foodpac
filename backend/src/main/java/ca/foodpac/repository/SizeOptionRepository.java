package ca.foodpac.repository;

import ca.foodpac.entity.SizeOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SizeOptionRepository extends JpaRepository<SizeOption, Long> {
    List<SizeOption> findByProductTypeKeyOrderBySortOrderAsc(String productTypeKey);
}
