package ca.foodpac.controller;

import ca.foodpac.dto.AddToCartRequest;
import ca.foodpac.dto.CartItemDto;
import ca.foodpac.entity.CartItem;
import ca.foodpac.entity.User;
import ca.foodpac.repository.CartItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartItemRepository cartItemRepository;

    @GetMapping
    public ResponseEntity<List<CartItemDto>> getCart(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(
            cartItemRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().map(CartItemDto::from).toList()
        );
    }

    @PostMapping
    public ResponseEntity<CartItemDto> addToCart(
            @AuthenticationPrincipal User user,
            @RequestBody AddToCartRequest req) {
        if (user == null) return ResponseEntity.status(401).build();
        if (req.imageUrl() == null || req.imageUrl().isBlank())
            return ResponseEntity.badRequest().build();
        if (req.quantity() == null || req.quantity() < 1)
            return ResponseEntity.badRequest().build();

        CartItem item = cartItemRepository.save(CartItem.builder()
                .user(user)
                .imageUrl(req.imageUrl())
                .productType(req.productType())
                .productLabel(req.productLabel())
                .sizeSpec(req.sizeSpec())
                .material(req.material())
                .quantity(req.quantity())
                .build());

        return ResponseEntity.ok(CartItemDto.from(item));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeFromCart(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        cartItemRepository.findByIdAndUser(id, user)
                .ifPresent(cartItemRepository::delete);
        return ResponseEntity.ok().build();
    }
}
