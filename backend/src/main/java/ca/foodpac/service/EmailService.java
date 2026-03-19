package ca.foodpac.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Sends emails via Resend HTTP API (HTTPS port 443).
 * Avoids SMTP port 465/587 which are often blocked by ISPs/firewalls.
 */
@Slf4j
@Service
public class EmailService {

    private static final String RESEND_API = "https://api.resend.com/emails";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.mail.from}")
    private String from;

    @Value("${RESEND_API_KEY:re_HrNBLThn_CgSHFgwWBeRnRqhuMZDP21ck}")
    private String apiKey;

    /**
     * Send an HTML email via Resend REST API.
     *
     * @param to      recipient address
     * @param subject email subject
     * @param html    HTML body
     */
    public void send(String to, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "from",    from,
                "to",      List.of(to),
                "subject", subject,
                "html",    html
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(RESEND_API, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent → {} | subject: {}", to, subject);
            } else {
                log.error("Resend API returned {}: {}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("Email send failed: HTTP " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Email send failed", e);
        }
    }
}
