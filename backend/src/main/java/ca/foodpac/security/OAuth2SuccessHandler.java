package ca.foodpac.security;

import ca.foodpac.entity.User;
import ca.foodpac.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Called after a successful Google OAuth2 login.
 * Creates or updates the User in the DB, issues a JWT HttpOnly cookie,
 * then redirects back to the frontend.
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String googleId     = oAuth2User.getAttribute("sub");
        String email        = oAuth2User.getAttribute("email");
        String name         = oAuth2User.getAttribute("name");
        String googlePicture = oAuth2User.getAttribute("picture");

        // Upsert user
        boolean isNew = false;
        User user = userRepository.findByGoogleId(googleId).orElse(null);
        if (user == null) {
            user = User.builder()
                    .googleId(googleId)
                    .email(email)
                    .name(name)
                    .build();
            isNew = true;
        } else {
            // Sync name from Google on every login (they may have updated it)
            user.setName(name);
            if (user.getEmail() == null) user.setEmail(email);
        }

        // On first login: store Google profile picture (may be null — frontend uses letter avatar)
        if (isNew || user.getPicture() == null) {
            user.setPicture(googlePicture);
        }

        // Keep Google picture in extra JSON as a backup / future option
        if (googlePicture != null && user.getExtra() == null) {
            user.setExtra(String.format("{\"googlePicture\":\"%s\"}", googlePicture));
        }

        user = userRepository.save(user);

        // Issue JWT in HttpOnly cookie (Set-Cookie header — Servlet API < 6 lacks SameSite)
        response.setHeader("Set-Cookie",
                String.format("fp_token=%s; Path=/; Max-Age=%d; HttpOnly%s; SameSite=Lax",
                        jwtUtil.generate(user.getId()),
                        (int) (expirationMs / 1000),
                        cookieSecure ? "; Secure" : ""));

        // Redirect back to frontend
        String redirectUrl = frontendUrl;
        String saved = getRedirectFromSession(request);
        if (saved != null && saved.startsWith(frontendUrl)) {
            redirectUrl = saved;
        }
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String getRedirectFromSession(HttpServletRequest request) {
        try {
            var session = request.getSession(false);
            if (session != null) return (String) session.getAttribute("authRedirect");
        } catch (Exception ignored) {}
        return null;
    }
}
