package ca.foodpac.repository;

import ca.foodpac.entity.DesignJobItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesignJobItemRepository extends JpaRepository<DesignJobItem, String> {
    List<DesignJobItem> findByJobIdAndDeletedFalseOrderByCreatedAtAsc(String jobId);
    List<DesignJobItem> findByJob_User_IdAndDeletedFalseOrderByCreatedAtDesc(Long userId);
    List<DesignJobItem> findByJob_AnonTokenAndDeletedFalseOrderByCreatedAtDesc(String anonToken);
}
