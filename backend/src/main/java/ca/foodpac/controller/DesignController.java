package ca.foodpac.controller;

import ca.foodpac.dto.ChatMessageRequest;
import ca.foodpac.dto.DesignMessageDto;
import ca.foodpac.dto.DesignSessionDto;
import ca.foodpac.entity.User;
import ca.foodpac.service.DesignChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/design")
@RequiredArgsConstructor
public class DesignController {

    private final DesignChatService designChatService;

    /** POST /api/v1/design/sessions — start a new session (guest or authenticated). */
    @PostMapping("/sessions")
    public ResponseEntity<DesignSessionDto> createSession(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(designChatService.createSession(user));
    }

    /** GET /api/v1/design/sessions — list sessions for authenticated user. */
    @GetMapping("/sessions")
    public ResponseEntity<List<DesignSessionDto>> listSessions(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(designChatService.listSessions(user));
    }

    /** GET /api/v1/design/sessions/{id} — load a session with full history. */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<DesignSessionDto> getSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(designChatService.getSession(sessionId, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /** POST /api/v1/design/sessions/{id}/messages — send a chat message, get AI reply. */
    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<DesignMessageDto> sendMessage(
            @PathVariable String sessionId,
            @Valid @RequestBody ChatMessageRequest req,
            @RequestHeader(value = "Accept-Language", defaultValue = "en") String lang,
            @AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(designChatService.chat(sessionId, user, req.message(), lang));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /**
     * POST /api/v1/design/sessions/{id}/results — save design images from Packify SDK callback.
     * Called by the frontend after packify.eventBus fires getDesignResults.
     * Body: { "images": ["url1", "url2", ...] }
     */
    @PostMapping("/sessions/{sessionId}/results")
    public ResponseEntity<Void> saveResults(
            @PathVariable String sessionId,
            @RequestBody Map<String, List<String>> body,
            @AuthenticationPrincipal User user) {
        List<String> images = body.get("images");
        if (images == null || images.isEmpty()) return ResponseEntity.badRequest().build();
        try {
            designChatService.saveResults(sessionId, user, images);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    /**
     * POST /api/v1/design/sessions/migrate — migrate guest session to authenticated user.
     * Body: { "guestSessionId": "..." }
     */
    @PostMapping("/sessions/migrate")
    public ResponseEntity<DesignSessionDto> migrateGuestSession(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        String guestSessionId = body.get("guestSessionId");
        if (guestSessionId == null || guestSessionId.isBlank()) return ResponseEntity.badRequest().build();
        try {
            return ResponseEntity.ok(designChatService.migrateGuestSession(guestSessionId, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).build();
        }
    }
}
