package ca.foodpac.repository;

import ca.foodpac.entity.QuoteRequest;
import ca.foodpac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuoteRequestRepository extends JpaRepository<QuoteRequest, String> {
    List<QuoteRequest> findByUserOrderByCreatedAtDesc(User user);

    /** All quotes not yet emailed, oldest first — used by the notification scheduler. */
    List<QuoteRequest> findByEmailSentFalseOrderByCreatedAtAsc();
}
