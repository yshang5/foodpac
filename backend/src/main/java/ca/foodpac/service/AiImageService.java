package ca.foodpac.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Base64;

/**
 * gpt-image-1 wrapper: re-renders a packaging template photo with the
 * customer's brand (logo + text) via the images/edits endpoint.
 * The template photo is the first input image; the logo (and QR) follow
 * as reference images the model prints onto the packaging.
 */
@Slf4j
@Service
public class AiImageService {

    private final RestClient restClient;
    private final String imageModel;
    private final String quality;
    private final ObjectMapper mapper = new ObjectMapper();

    public AiImageService(
            @Value("${openai.api-key}") String apiKey,
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.image-model:gpt-image-1}") String imageModel,
            @Value("${openai.image-quality:medium}") String quality) {
        this.imageModel = imageModel;
        this.quality = quality;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(180_000);        // image generation takes 15–60s
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
    }

    /**
     * @param templateJpg base packaging photo (kept: angle, lighting, shape)
     * @param logoPng     customer logo, may be null (brand rendered as text)
     * @param qrPng       ordering QR, may be null (illustrative only in mockups)
     * @return PNG bytes of the generated mockup
     */
    public byte[] rebrand(byte[] templateJpg, byte[] logoPng, byte[] qrPng, String prompt) {
        // Plain MultiValueMap multipart — MultipartBodyBuilder needs reactive-streams
        // on the classpath, which this servlet-only app doesn't ship.
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model", imageModel);
        body.add("prompt", prompt);
        body.add("size", "1024x1024");
        body.add("quality", quality);
        body.add("n", "1");
        body.add("image[]", new NamedResource(templateJpg, "template.jpg"));
        if (logoPng != null) body.add("image[]", new NamedResource(logoPng, "logo.png"));
        if (qrPng != null) body.add("image[]", new NamedResource(qrPng, "qr.png"));

        String resp = restClient.post()
                .uri("/v1/images/edits")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(String.class);
        try {
            JsonNode root = mapper.readTree(resp);
            String b64 = root.path("data").path(0).path("b64_json").asText(null);
            if (b64 == null) throw new IllegalStateException("no b64_json in response");
            return Base64.getDecoder().decode(b64);
        } catch (Exception e) {
            throw new RuntimeException("images/edits parse failed: " + e.getMessage(), e);
        }
    }

    /** ByteArrayResource with a filename so multipart parts carry one. */
    private static class NamedResource extends ByteArrayResource {
        private final String filename;
        NamedResource(byte[] bytes, String filename) { super(bytes); this.filename = filename; }
        @Override public String getFilename() { return filename; }
    }
}
