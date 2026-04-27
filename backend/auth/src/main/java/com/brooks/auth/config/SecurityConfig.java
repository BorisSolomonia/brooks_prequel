package com.brooks.auth.config;

import com.brooks.auth.service.UserRoleProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${auth0.domain}")
    private String auth0Domain;

    @Value("${auth0.audience}")
    private String audience;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private List<String> allowedOrigins;

    @Autowired(required = false)
    private UserRoleProvider roleProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/auth/callback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/creators/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/guides/*/preview").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/guides/*/reviews").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/search/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/rankings/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/webhooks/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/media/local/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(
                "https://" + auth0Domain + "/.well-known/jwks.json").build();

        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(
                "https://" + auth0Domain + "/");
        OAuth2TokenValidator<Jwt> withAudience = new DelegatingOAuth2TokenValidator<>(
                withIssuer, new AudienceValidator(audience));
        decoder.setJwtValidator(withAudience);

        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setPrincipalClaimName("sub");
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            if (roleProvider != null) {
                return roleProvider.getAuthoritiesForSubject(jwt.getSubject());
            }
            return List.of(new SimpleGrantedAuthority("ROLE_USER"));
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    static class AudienceValidator implements OAuth2TokenValidator<Jwt> {
        private final String audience;

        AudienceValidator(String audience) {
            this.audience = audience;
        }

        @Override
        public OAuth2TokenValidatorResult validate(Jwt jwt) {
            if (jwt.getAudience() != null && jwt.getAudience().contains(audience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Missing required audience: " + audience, null));
        }
    }
}
