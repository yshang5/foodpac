package ca.foodpac.repository;

import ca.foodpac.entity.DesignMessage;
import ca.foodpac.entity.DesignSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesignMessageRepository extends JpaRepository<DesignMessage, String> {

    List<DesignMessage> findBySessionOrderByCreatedAtAsc(DesignSession session);
}
