package ca.foodpac.dto;

import ca.foodpac.entity.CartItem;

import java.time.Instant;

public record CartItemDto(
        String id,
        String imageUrl,
        String productType,
        String productLabel,
        String sizeSpec,
        String material,
        Integer quantity,
        Instant createdAt
) {
    public static CartItemDto from(CartItem item) {
        return new CartItemDto(
                item.getId(),
                item.getImageUrl(),
                item.getProductType(),
                item.getProductLabel(),
                item.getSizeSpec(),
                item.getMaterial(),
                item.getQuantity(),
                item.getCreatedAt()
        );
    }
}
