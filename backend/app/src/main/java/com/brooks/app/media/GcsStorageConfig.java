package com.brooks.app.media;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
public class GcsStorageConfig {

    @Bean
    public Storage gcsStorage(
            @Value("${GCP_PROJECT_ID:}") String projectId,
            @Value("${GCS_CREDENTIALS_JSON:}") String credentialsJson) throws IOException {
        StorageOptions.Builder builder = StorageOptions.newBuilder();
        if (projectId != null && !projectId.isBlank()) {
            builder.setProjectId(projectId);
        }
        if (credentialsJson != null && !credentialsJson.isBlank()) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8)));
            builder.setCredentials(credentials);
        }
        return builder.build().getService();
    }
}
