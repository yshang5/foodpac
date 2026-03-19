package ca.foodpac.dto;

import java.util.List;

public record SubmitQuoteRequest(
        String contactName,
        String contactPhone,   // required
        String businessName,   // optional
        String notes,          // optional
        List<String> cartItemIds  // optional — if provided, only quote these items
) {}
