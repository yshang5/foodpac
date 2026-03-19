package ca.foodpac.dto;

import java.util.List;

public record ContactInquiryRequest(
        String       businessName,
        String       contactName,
        String       email,
        String       phone,
        String       city,
        String       restaurantType,
        List<String> products,
        String       quantity,
        String       hasLogo,
        String       notes
) {}
