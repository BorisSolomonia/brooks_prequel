package com.brooks.app.media;

import com.brooks.common.exception.BusinessException;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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

    @Value("${MEDIA_MAX_UPLOAD_SIZE_MB:10}")
    private long maxUploadSizeMb;

    public MediaUploadResponse upload(UUID userId, MediaUsage usage, MultipartFile file) {
        validateConfig();
        validateFile(file);

        String contentType = file.getContentType();
        String extension = EXTENSIONS.get(contentType);
        String objectName = "%s/%s/%s.%s".formatted(
                usage.pathPrefix(),
                userId,
                UUID.randomUUID(),
                extension
        );

        BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, objectName)
                .setContentType(contentType)
                .setCacheControl("public, max-age=31536000, immutable")
                .build();

        try {
            storage.create(blobInfo, file.getBytes());
        } catch (IOException ex) {
            throw new BusinessException("Could not read uploaded image");
        } catch (RuntimeException ex) {
            throw new BusinessException("Could not upload image to storage");
        }

        return MediaUploadResponse.builder()
                .url(publicUrl(bucketName, objectName))
                .objectName(objectName)
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .build();
    }

    private void validateConfig() {
        if (bucketName == null || bucketName.isBlank()) {
            throw new BusinessException("Media storage bucket is not configured");
        }
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
