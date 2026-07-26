package ca.foodpac.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Asks OpenAI (vision) for a brand spec — palette + style — derived from the
 * uploaded logo and/or form fields. Falls back to a palette extracted from the
 * logo pixels (or a default) if the API call fails, so generation never blocks.
 */
@Slf4j
@Service
public class BrandSpecService {

    private final RestClient restClient;
    private final String model;
    private final ObjectMapper mapper = new ObjectMapper();

    public BrandSpecService(
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

    /** Palette + style used by the renderer. All colors are #rrggbb. */
    public record BrandSpec(String primary, String secondary, String panelBg,
                            String textColor, String styleName) {}

    public BrandSpec generate(byte[] logoBytes, String brandText, String restaurantType, String slogan) {
        try {
            List<Object> content = new ArrayList<>();
            String brief = """
                    Design a packaging brand palette for a restaurant.
                    Brand: %s
                    Restaurant type: %s
                    Slogan: %s
                    Return ONLY a JSON object:
                    {"primary":"#rrggbb","secondary":"#rrggbb","panelBg":"#rrggbb","textColor":"#rrggbb","styleName":"..."}
                    Rules: primary/secondary must complement the logo colors if a logo image is provided \
                    (pick FROM the logo where possible); panelBg must be a very light tint (near-white or cream) \
                    that both text colors read clearly on; textColor is for body text (dark); \
                    styleName is a 2-3 word style label (e.g. "modern minimal", "warm rustic").
                    """.formatted(nz(brandText), nz(restaurantType), nz(slogan));
            content.add(Map.of("type", "text", "text", brief));
            if (logoBytes != null) {
                content.add(Map.of("type", "image_url", "image_url", Map.of(
                        "url", "data:image/png;base64," + Base64.getEncoder().encodeToString(logoBytes),
                        "detail", "low")));
            }

            var request = Map.of(
                    "model", model,
                    "messages", List.of(Map.of("role", "user", "content", content)),
                    "max_tokens", 200,
                    "temperature", 0.4,
                    "response_format", Map.of("type", "json_object"));

            String body = restClient.post().uri("/v1/chat/completions")
                    .body(request).retrieve().body(String.class);
            JsonNode root = mapper.readTree(body);
            JsonNode msg = root.path("choices").path(0).path("message").path("content");
            JsonNode spec = mapper.readTree(msg.asText());
            return new BrandSpec(
                    hex(spec.path("primary").asText(), "#2e7d32"),
                    hex(spec.path("secondary").asText(), "#f57c00"),
                    hex(spec.path("panelBg").asText(), "#faf7f0"),
                    hex(spec.path("textColor").asText(), "#333333"),
                    spec.path("styleName").asText("modern minimal"));
        } catch (Exception e) {
            log.warn("Brand spec via OpenAI failed, using fallback: {}", e.getMessage());
            return fallback(logoBytes);
        }
    }

    /** Dominant-color fallback: pick the most saturated frequent color from the logo. */
    private BrandSpec fallback(byte[] logoBytes) {
        String primary = "#2e7d32";
        try {
            if (logoBytes != null) {
                BufferedImage img = ImageIO.read(new ByteArrayInputStream(logoBytes));
                if (img != null) {
                    int best = 0; float bestScore = -1;
                    for (int y = 0; y < img.getHeight(); y += Math.max(1, img.getHeight() / 40)) {
                        for (int x = 0; x < img.getWidth(); x += Math.max(1, img.getWidth() / 40)) {
                            int rgb = img.getRGB(x, y);
                            int a = (rgb >>> 24), r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
                            if (a < 128) continue;
                            float[] hsb = java.awt.Color.RGBtoHSB(r, g, b, null);
                            float score = hsb[1] * (1 - Math.abs(hsb[2] - 0.55f));
                            if (score > bestScore) { bestScore = score; best = rgb; }
                        }
                    }
                    if (bestScore > 0.15f)
                        primary = String.format("#%06x", best & 0xffffff);
                }
            }
        } catch (Exception ignored) {}
        return new BrandSpec(primary, "#f57c00", "#faf7f0", "#333333", "modern minimal");
    }

    private static String nz(String s) { return s == null || s.isBlank() ? "(not provided)" : s; }

    private static String hex(String s, String def) {
        return s != null && s.matches("#[0-9a-fA-F]{6}") ? s.toLowerCase() : def;
    }
}
