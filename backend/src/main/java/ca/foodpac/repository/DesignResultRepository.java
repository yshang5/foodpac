package ca.foodpac.repository;

import ca.foodpac.entity.DesignResult;
import ca.foodpac.entity.DesignSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesignResultRepository extends JpaRepository<DesignResult, String> {

    List<DesignResult> findBySessionOrderByCreatedAtAsc(DesignSession session);
}
