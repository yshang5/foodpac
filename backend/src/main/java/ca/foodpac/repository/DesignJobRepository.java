package ca.foodpac.repository;

import ca.foodpac.entity.DesignJob;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignJobRepository extends JpaRepository<DesignJob, String> {
    long countByAnonToken(String anonToken);
    java.util.List<DesignJob> findByAnonToken(String anonToken);
}
