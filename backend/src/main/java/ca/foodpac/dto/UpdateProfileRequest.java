package ca.foodpac.dto;

import jakarta.validation.constraints.Size;

/** Body for PUT /api/v1/users/profile */
public record UpdateProfileRequest(
        @Size(max = 120) String name,
        @Size(max = 30)  String phone,
        @Size(max = 120) String company,
        @Size(max = 255) String address,
        String extra   // raw JSON string — caller is responsible for valid JSON
) {}
