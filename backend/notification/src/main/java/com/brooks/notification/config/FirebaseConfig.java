package com.brooks.notification.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Initializes the Firebase Admin SDK at startup. The credentials JSON is
 * resolved in this order:
 *
 *   1. brooks.firebase.credentials-path env / app property  — absolute path
 *      to the service-account JSON. Use this in production (mount as a
 *      Kubernetes secret or similar).
 *   2. classpath:firebase-admin.json  — for dev. Drop the JSON downloaded
 *      from Firebase Console > Service accounts at
 *      backend/app/src/main/resources/firebase-admin.json. The file is
 *      gitignored.
 *
 * If neither is present, FirebaseMessaging is registered as a no-op bean
 * so the rest of the app boots — push sends become console-warn no-ops
 * instead of throwing at startup. This keeps local dev workable without
 * Firebase credentials.
 */
@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${brooks.firebase.credentials-path:}")
    private String credentialsPath;

    @Bean
    public FirebaseMessaging firebaseMessaging() {
        try {
            Resource resource = resolveCredentialsResource();
            if (resource == null) {
                log.warn("Firebase credentials not found — push notifications disabled. "
                        + "Drop firebase-admin.json into backend/app/src/main/resources/ or set "
                        + "brooks.firebase.credentials-path.");
                return null;
            }
            try (InputStream in = resource.getInputStream()) {
                GoogleCredentials creds = GoogleCredentials.fromStream(in);
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(creds)
                        .build();
                FirebaseApp app = FirebaseApp.getApps().isEmpty()
                        ? FirebaseApp.initializeApp(options)
                        : FirebaseApp.getInstance();
                log.info("Firebase initialized from {}", resource.getDescription());
                return FirebaseMessaging.getInstance(app);
            }
        } catch (IOException e) {
            log.error("Failed to initialize Firebase — push notifications disabled", e);
            return null;
        }
    }

    private Resource resolveCredentialsResource() {
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            FileSystemResource fs = new FileSystemResource(credentialsPath);
            if (fs.exists()) return fs;
            log.warn("brooks.firebase.credentials-path set to {} but file does not exist", credentialsPath);
        }
        ClassPathResource cp = new ClassPathResource("firebase-admin.json");
        return cp.exists() ? cp : null;
    }
}
