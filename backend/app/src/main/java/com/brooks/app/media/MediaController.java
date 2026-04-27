package com.brooks.app.media;

import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MediaController {

    private final MediaStorageService mediaStorageService;
    private final UserService userService;

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaUploadResponse> uploadMedia(
            Authentication authentication,
            @RequestParam("usage") MediaUsage usage,
            @RequestParam("file") MultipartFile file) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        User user = userService.findByAuth0Subject(subject);
        return ResponseEntity.ok(mediaStorageService.upload(user.getId(), usage, file));
    }
}
