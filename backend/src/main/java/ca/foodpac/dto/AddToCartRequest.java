package ca.foodpac.dto;

public record AddToCartRequest(
        String imageUrl,
        String productType,
        String productLabel,
        String sizeSpec,
        String material,
        Integer quantity
) {}
