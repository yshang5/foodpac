package ca.foodpac.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Flexible DTO for Packify webhook callback.
 * Handles both REST API format and SDK format field names.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PackifyCallbackDto(
        // REST API format
        @JsonProperty("project_id") String projectId,

        // SDK format (fallback)
        @JsonProperty("projectId") String projectIdSdk,

        String status,

        // REST API format
        @JsonProperty("images") List<String> images,

        // SDK format (fallback)
        @JsonProperty("list") List<String> list
) {
    public String resolvedProjectId() {
        return projectId != null ? projectId : projectIdSdk;
    }

    public List<String> resolvedImages() {
        if (images != null && !images.isEmpty()) return images;
        if (list != null && !list.isEmpty()) return list;
        return List.of();
    }
}
