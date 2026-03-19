package ca.foodpac.config;

import ca.foodpac.security.JwtAuthFilter;
import ca.foodpac.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())   // JWT cookie + SameSite=Lax gives CSRF protection
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/quotes").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/contact").permitAll()
                .requestMatchers("/api/v1/auth/me", "/api/v1/auth/logout").permitAll()
                // Guest-mode design endpoints — work without login
                .requestMatchers(HttpMethod.POST, "/api/v1/design/sessions").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/design/sessions/*/messages").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/design/sessions/*/results").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/v1/design/sessions/*").permitAll()
                // Protected
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler)
                // Always show Google account picker — prevents silent re-login after logout
                .authorizationEndpoint(endpoint -> endpoint
                    .authorizationRequestResolver(googlePromptSelectAccountResolver()))
            )
            .logout(logout -> logout
                // Accept ANY HTTP method so GET /api/v1/auth/logout (browser nav) also works
                .logoutRequestMatcher(new AntPathRequestMatcher("/api/v1/auth/logout"))
                .invalidateHttpSession(true)       // kill the OAuth2 state session
                .clearAuthentication(true)
                .addLogoutHandler((req, res, auth) -> {
                    // Delete the JWT cookie — attributes must match how it was Set
                    String clear = String.format(
                        "fp_token=; Path=/; Max-Age=0; HttpOnly%s; SameSite=Lax",
                        cookieSecure ? "; Secure" : "");
                    res.addHeader("Set-Cookie", clear);
                })
                // Redirect to frontend home — browser follows the 302, cookie is already cleared
                .logoutSuccessHandler((req, res, auth) ->
                    res.sendRedirect(frontendUrl))
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // Return 401 JSON for unauthenticated /api/** requests instead of 302 OAuth2 redirect
            .exceptionHandling(ex -> ex
                .defaultAuthenticationEntryPointFor(
                    (req, res, e) -> {
                        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        res.setContentType("application/json");
                        res.getWriter().write("{\"error\":\"Unauthorized\"}");
                    },
                    new AntPathRequestMatcher("/api/**")
                )
            );

        return http.build();
    }

    /**
     * Custom resolver that injects prompt=select_account into every Google
     * authorization request so users always see the account picker instead of
     * being silently re-logged in after logout.
     */
    private DefaultOAuth2AuthorizationRequestResolver googlePromptSelectAccountResolver() {
        var resolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                OAuth2AuthorizationRequestRedirectFilter.DEFAULT_AUTHORIZATION_REQUEST_BASE_URI);
        resolver.setAuthorizationRequestCustomizer(builder ->
                builder.additionalParameters(params -> params.put("prompt", "select_account")));
        return resolver;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);   // required for cookie-based auth
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
