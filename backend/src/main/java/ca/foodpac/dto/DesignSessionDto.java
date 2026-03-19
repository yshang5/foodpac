package ca.foodpac.dto;

import ca.foodpac.entity.DesignResult;
import ca.foodpac.entity.DesignSession;
import ca.foodpac.entity.DesignMessage;

import java.time.Instant;
import java.util.List;

public record DesignSessionDto(
        String id,
        String status,
        List<DesignMessageDto> messages,
        List<String> imageUrls,
        Instant createdAt,
        Instant updatedAt
) {
    /** Full session with messages (used for loading a session) */
    public static DesignSessionDto full(DesignSession s,
                                        List<DesignMessage> messages,
                                        List<DesignResult> results) {
        return new DesignSessionDto(
                s.getId(),
                s.getStatus().name(),
                messages.stream().map(DesignMessageDto::from).toList(),
                results.stream().map(DesignResult::getImageUrl).toList(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }

    /** Summary without messages (used for history list) */
    public static DesignSessionDto summary(DesignSession s, List<DesignResult> results) {
        return new DesignSessionDto(
                s.getId(),
                s.getStatus().name(),
                List.of(),
                results.stream().map(DesignResult::getImageUrl).toList(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
