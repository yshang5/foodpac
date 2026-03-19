package ca.foodpac.controller;

import ca.foodpac.dto.QuoteResponseDto;
import ca.foodpac.dto.SubmitQuoteRequest;
import ca.foodpac.entity.*;
import ca.foodpac.repository.CartItemRepository;
import ca.foodpac.repository.QuoteRequestRepository;
import ca.foodpac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/quotes")
@RequiredArgsConstructor
public class QuoteController {

    private final CartItemRepository     cartItemRepository;
    private final QuoteRequestRepository quoteRequestRepository;
    private final UserRepository         userRepository;

    /** GET /api/v1/quotes — list all quotes for the current user */
    @GetMapping
    public ResponseEntity<List<QuoteResponseDto>> list(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        List<QuoteResponseDto> quotes = quoteRequestRepository
                .findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(QuoteResponseDto::from)
                .toList();
        return ResponseEntity.ok(quotes);
    }

    /**
     * POST /api/v1/quotes
     * Converts selected (or all) cart items into a QuoteRequest, then removes them from cart.
     */
    @PostMapping
    public ResponseEntity<QuoteResponseDto> submit(
            @AuthenticationPrincipal User user,
            @RequestBody SubmitQuoteRequest req) {

        if (user == null) return ResponseEntity.status(401).build();
        if (req.contactPhone() == null || req.contactPhone().isBlank())
            return ResponseEntity.badRequest().build();

        // Resolve which cart items to include
        List<CartItem> cartItems;
        if (req.cartItemIds() != null && !req.cartItemIds().isEmpty()) {
            cartItems = cartItemRepository.findByUserAndIdIn(user, req.cartItemIds());
        } else {
            cartItems = cartItemRepository.findByUserOrderByCreatedAtDesc(user);
        }
        if (cartItems.isEmpty()) return ResponseEntity.badRequest().build();

        QuoteRequest quote = QuoteRequest.builder()
                .user(user)
                .contactName(req.contactName() != null ? req.contactName() : user.getName())
                .contactEmail(user.getEmail())
                .contactPhone(req.contactPhone().strip())
                .businessName(req.businessName())
                .notes(req.notes())
                .build();

        for (CartItem ci : cartItems) {
            QuoteItem qi = QuoteItem.builder()
                    .quoteRequest(quote)
                    .imageUrl(ci.getImageUrl())
                    .productType(ci.getProductType())
                    .productLabel(ci.getProductLabel())
                    .sizeSpec(ci.getSizeSpec())
                    .material(ci.getMaterial())
                    .quantity(ci.getQuantity())
                    .build();
            quote.getItems().add(qi);
        }

        quote = quoteRequestRepository.save(quote);

        // Remove quoted items from cart
        cartItemRepository.deleteAll(cartItems);

        // Save phone & company back to user profile for future pre-fill
        boolean profileChanged = false;
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            user.setPhone(req.contactPhone().strip());
            profileChanged = true;
        }
        if (req.businessName() != null && !req.businessName().isBlank()
                && (user.getCompany() == null || user.getCompany().isBlank())) {
            user.setCompany(req.businessName().strip());
            profileChanged = true;
        }
        if (profileChanged) userRepository.save(user);

        log.info("=== NEW QUOTE {} ===  from {} <{}> | phone: {} | business: {} | {} item(s)",
                quote.getId(), quote.getContactName(), quote.getContactEmail(),
                quote.getContactPhone(), quote.getBusinessName(), quote.getItems().size());

        return ResponseEntity.ok(QuoteResponseDto.from(quote));
    }
}
