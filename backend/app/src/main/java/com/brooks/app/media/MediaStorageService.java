package com.brooks.app.media;

import com.brooks.common.exception.BusinessException;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final Storage storage;

    @Value("${GCS_BUCKET:}")
    private String bucketName;

    @Value("${GCS_CREDENTIALS_JSON:}")
    private String credentialsJson;

    @Value("${MEDIA_MAX_UPLOAD_SIZE_MB:10}")
    private long maxUploadSizeMb;

    @Value("${APP_BASE_URL:http://localhost:8080}")
    private String appBaseUrl;

    @Value("${LOCAL_MEDIA_DIR:/tmp/brooks-media}")
    private String localMediaDir;

    public MediaUploadResponse upload(UUID userId, MediaUsage usage, MultipartFile file) {
        validateFile(file);
        if (isLocalMode()) {
            return uploadLocal(userId, usage, file);
        }
        return uploadGcs(userId, usage, file);
    }

    private boolean isLocalMode() {
        return credentialsJson == null || credentialsJson.isBlank();
    }

    private MediaUploadResponse uploadLocal(UUID userId, MediaUsage usage, MultipartFile file) {
        String contentType = file.getContentType();
        String extension = EXTENSIONS.get(contentType);
        String relativePath = "%s/%s/%s.%s".formatted(usage.pathPrefix(), userId, UUID.randomUUID(), extension);
        Path filePath = Path.of(localMediaDir).resolve(relativePath);
        try {
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, file.getBytes());
        } catch (IOException ex) {
            throw new BusinessException("Could not save image locally: " + ex.getMessage());
        }
        log.debug("Saved media locally: {}", filePath);
        return MediaUploadResponse.builder()
                .url(appBaseUrl + "/api/media/local/" + relativePath)
                .objectName(relativePath)
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .build();
    }

    private MediaUploadResponse uploadGcs(UUID userId, MediaUsage usage, MultipartFile file) {
        if (bucketName == null || bucketName.isBlank()) {
            throw new BusinessException("Media storage bucket is not configured");
        }
        String contentType = file.getContentType();
        String extension = EXTENSIONS.get(contentType);
        String objectName = "%s/%s/%s.%s".formatted(usage.pathPrefix(), userId, UUID.randomUUID(), extension);

        BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, objectName)
                .setContentType(contentType)
                .setCacheControl("public, max-age=31536000, immutable")
                .build();

        try {
            storage.create(blobInfo, file.getBytes());
        } catch (IOException ex) {
            throw new BusinessException("Could not read uploaded image");
        } catch (RuntimeException ex) {
            log.error("GCS upload failed: {}", ex.getMessage(), ex);
            throw new BusinessException("Could not upload image to storage: " + ex.getMessage());
        }

        return MediaUploadResponse.builder()
                .url(publicUrl(bucketName, objectName))
                .objectName(objectName)
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .build();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BusinessException("Only JPEG, PNG, and WebP images are supported");
        }
        long maxBytes = maxUploadSizeMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new BusinessException("Image must be " + maxUploadSizeMb + " MB or smaller");
        }
    }

    private static String publicUrl(String bucket, String objectName) {
        String encodedPath = objectName.replace("\\", "/");
        String[] segments = encodedPath.split("/");
        for (int i = 0; i < segments.length; i++) {
            segments[i] = URLEncoder.encode(segments[i], StandardCharsets.UTF_8).replace("+", "%20");
        }
        return "https://storage.googleapis.com/" + bucket + "/" + String.join("/", segments);
    }
}
