package ca.foodpac.dto;

import ca.foodpac.entity.DesignMessage;

import java.time.Instant;

public record DesignMessageDto(
        String id,
        String role,
        String content,
        Instant createdAt,
        boolean autoGenerating,          // true when AI detected generate-intent and auto-triggered Packify
        java.util.Map<String, String> designInfo  // live-extracted: product, brand, style, colors, logoUrl
) {
    public static DesignMessageDto from(DesignMessage m) {
        return new DesignMessageDto(m.getId(), m.getRole().name(), m.getContent(), m.getCreatedAt(), false, null);
    }

    public static DesignMessageDto fromWithGenerate(DesignMessage m) {
        return new DesignMessageDto(m.getId(), m.getRole().name(), m.getContent(), m.getCreatedAt(), true, null);
    }

    public static DesignMessageDto fromFull(DesignMessage m, boolean autoGen, java.util.Map<String, String> info) {
        return new DesignMessageDto(m.getId(), m.getRole().name(), m.getContent(), m.getCreatedAt(), autoGen, info);
    }
}
