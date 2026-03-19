package ca.foodpac.repository;

import ca.foodpac.entity.DesignSession;
import ca.foodpac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DesignSessionRepository extends JpaRepository<DesignSession, String> {

    List<DesignSession> findByUserOrderByCreatedAtDesc(User user);

    Optional<DesignSession> findByPackifyProjectId(String packifyProjectId);
}
