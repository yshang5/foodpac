package ca.foodpac.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OpenAiClient {

    private final RestClient restClient;
    private final String model;

    public OpenAiClient(
            @Value("${openai.api-key}") String apiKey,
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.model}") String model) {
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Send a conversation to OpenAI and return the assistant's reply.
     *
     * @param messages list of {role, content} maps (system + history + new user message)
     * @return assistant reply text
     */
    public String chat(List<Map<String, String>> messages) {
        var request = Map.of(
                "model", model,
                "messages", messages,
                "max_tokens", 800,
                "temperature", 0.7
        );

        try {
            ChatCompletionResponse response = restClient.post()
                    .uri("/v1/chat/completions")
                    .body(request)
                    .retrieve()
                    .body(ChatCompletionResponse.class);

            if (response != null && response.choices() != null && !response.choices().isEmpty()) {
                return response.choices().get(0).message().content();
            }
        } catch (Exception e) {
            log.error("OpenAI chat error: {}", e.getMessage(), e);
        }
        return "Sorry, I'm having trouble connecting right now. Please try again.";
    }

    /**
     * Extract structured design brief fields from the latest conversation messages.
     * Returns a map with keys: product, brand, style, colors, logoUrl (values may be null).
     * Uses a small, focused prompt so this call is fast and cheap.
     */
    public Map<String, String> extractDesignInfo(List<Map<String, String>> conversationMessages) {
        // Take only the last 8 turns (enough context, avoids long prompts)
        var turns = conversationMessages.stream()
                .filter(m -> !"system".equals(m.get("role")))
                .toList();
        int start = Math.max(0, turns.size() - 8);
        String snippet = turns.subList(start, turns.size()).stream()
                .map(m -> m.get("role").toUpperCase() + ": " + m.get("content"))
                .reduce("", (a, b) -> a + "\n" + b).trim();

        var msgs = List.of(
                Map.of("role", "system", "content",
                        "You extract packaging design brief info from a conversation. " +
                        "Return ONLY valid JSON on one line, no explanation: " +
                        "{\"product\":\"...\",\"brand\":\"...\",\"style\":\"...\",\"colors\":\"...\",\"logoUrl\":\"...\"} " +
                        "Use null (no quotes) for any field not yet mentioned."),
                Map.of("role", "user", "content", "Conversation:\n" + snippet)
        );

        var request = Map.of(
                "model", model,
                "messages", msgs,
                "max_tokens", 120,
                "temperature", 0
        );

        try {
            ChatCompletionResponse response = restClient.post()
                    .uri("/v1/chat/completions")
                    .body(request)
                    .retrieve()
                    .body(ChatCompletionResponse.class);

            if (response != null && response.choices() != null && !response.choices().isEmpty()) {
                String json = response.choices().get(0).message().content().trim();
                // Parse the JSON and convert to map (skip null values)
                com.fasterxml.jackson.databind.JsonNode node =
                        new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
                Map<String, String> result = new java.util.LinkedHashMap<>();
                node.fields().forEachRemaining(e -> {
                    if (!e.getValue().isNull()) {
                        String val = e.getValue().asText().trim();
                        if (!val.isEmpty() && !val.equals("null"))
                            result.put(e.getKey(), val);
                    }
                });
                return result.isEmpty() ? null : result;
            }
        } catch (Exception e) {
            log.warn("extractDesignInfo failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Summarize a conversation into a Packify design description.
     */
    public String summarizeToDesignDescription(List<Map<String, String>> conversationMessages) {
        String conversationText = conversationMessages.stream()
                .filter(m -> !"system".equals(m.get("role")))
                .map(m -> m.get("role").toUpperCase() + ": " + m.get("content"))
                .reduce("", (a, b) -> a + "\n" + b);

        var summaryMessages = List.of(
                Map.of("role", "system", "content",
                        "You are a packaging design brief writer. Based on the conversation below, " +
                        "extract key design requirements and write a concise description for an AI packaging design API. " +
                        "Include: product type, brand name, design style, color scheme, and logo if mentioned. " +
                        "Write in English. Return ONLY the description, nothing else. Max 200 words."),
                Map.of("role", "user", "content", "Conversation:\n" + conversationText)
        );

        var request = Map.of(
                "model", model,
                "messages", summaryMessages,
                "max_tokens", 300,
                "temperature", 0.3
        );

        try {
            ChatCompletionResponse response = restClient.post()
                    .uri("/v1/chat/completions")
                    .body(request)
                    .retrieve()
                    .body(ChatCompletionResponse.class);

            if (response != null && response.choices() != null && !response.choices().isEmpty()) {
                return response.choices().get(0).message().content();
            }
        } catch (Exception e) {
            log.error("OpenAI summarize error: {}", e.getMessage(), e);
        }
        return "Custom eco-friendly food packaging with brand logo";
    }

    // ── Response DTOs ──────────────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatCompletionResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {}
}
