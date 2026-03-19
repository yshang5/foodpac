package ca.foodpac.controller;

import ca.foodpac.dto.UserDto;
import ca.foodpac.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/v1/auth/me — returns the current user, or 401.
 *
 * Logout is handled by Spring Security's LogoutFilter at the same path
 * (POST /api/v1/auth/logout) — see SecurityConfig for cookie-clearing logic.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(UserDto.from(user));
    }
}
