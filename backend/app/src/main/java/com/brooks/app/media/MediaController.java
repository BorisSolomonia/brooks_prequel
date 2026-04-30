package com.brooks.app.media;

import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MediaController {

    private static final String LOCAL_MEDIA_PREFIX = "/api/media/local/";

    private final MediaStorageService mediaStorageService;
    private final UserService userService;

    @Value("${LOCAL_MEDIA_DIR:/tmp/brooks-media}")
    private String localMediaDir;

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaUploadResponse> uploadMedia(
            Authentication authentication,
            @RequestParam("usage") MediaUsage usage,
            @RequestParam("file") MultipartFile file) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        User user = userService.findByAuth0Subject(subject);
        return ResponseEntity.ok(mediaStorageService.upload(user.getId(), usage, file));
    }

    @GetMapping("/media/local/**")
    public ResponseEntity<Resource> serveLocalMedia(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        int prefixIndex = requestUri.indexOf(LOCAL_MEDIA_PREFIX);
        if (prefixIndex < 0) return ResponseEntity.notFound().build();
        String relativePath = requestUri.substring(prefixIndex + LOCAL_MEDIA_PREFIX.length());
        // prevent path traversal
        if (relativePath.contains("..")) return ResponseEntity.badRequest().build();
        Path filePath = Path.of(localMediaDir).resolve(relativePath).normalize();
        if (!filePath.startsWith(Path.of(localMediaDir).normalize())) return ResponseEntity.badRequest().build();
        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String contentType = detectContentType(relativePath);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private static String detectContentType(String path) {
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        if (path.endsWith(".m4a")) return "audio/mp4";
        if (path.endsWith(".webm")) return "audio/webm";
        if (path.endsWith(".ogg")) return "audio/ogg";
        if (path.endsWith(".wav")) return "audio/wav";
        return "image/jpeg";
    }
}
