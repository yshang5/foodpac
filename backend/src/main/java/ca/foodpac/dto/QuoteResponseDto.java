package ca.foodpac.dto;

import ca.foodpac.entity.QuoteItem;
import ca.foodpac.entity.QuoteRequest;
import ca.foodpac.entity.QuoteStatus;

import java.time.Instant;
import java.util.List;

public record QuoteResponseDto(
        String id,
        QuoteStatus status,
        String contactName,
        String contactEmail,
        String contactPhone,
        String businessName,
        String notes,
        List<QuoteItemDto> items,
        Instant createdAt
) {
    public record QuoteItemDto(
            String imageUrl,
            String productType,
            String productLabel,
            String sizeSpec,
            String material,
            Integer quantity
    ) {
        public static QuoteItemDto from(QuoteItem i) {
            return new QuoteItemDto(i.getImageUrl(), i.getProductType(), i.getProductLabel(),
                    i.getSizeSpec(), i.getMaterial(), i.getQuantity());
        }
    }

    public static QuoteResponseDto from(QuoteRequest q) {
        return new QuoteResponseDto(
                q.getId(), q.getStatus(),
                q.getContactName(), q.getContactEmail(), q.getContactPhone(),
                q.getBusinessName(), q.getNotes(),
                q.getItems().stream().map(QuoteItemDto::from).toList(),
                q.getCreatedAt()
        );
    }
}
