package ca.foodpac.repository;

import ca.foodpac.entity.CartItem;
import ca.foodpac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, String> {
    List<CartItem> findByUserOrderByCreatedAtDesc(User user);
    Optional<CartItem> findByIdAndUser(String id, User user);
    List<CartItem> findByUserAndIdIn(User user, List<String> ids);
}
