package com.brooks.app.media;

import com.brooks.common.exception.BusinessException;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MediaStorageServiceTest {

    private Storage storage;
    private MediaStorageService service;

    @BeforeEach
    void setUp() {
        storage = mock(Storage.class);
        service = new MediaStorageService(storage);
        ReflectionTestUtils.setField(service, "bucketName", "brooks-media");
        ReflectionTestUtils.setField(service, "credentialsJson", "fake-credentials");
        ReflectionTestUtils.setField(service, "maxUploadSizeMb", 10L);
    }

    @Test
    void uploadStoresImageUnderUsageAndUserPath() {
        when(storage.create(any(BlobInfo.class), any(byte[].class))).thenReturn(mock(Blob.class));
        UUID userId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[] {1, 2, 3}
        );

        MediaUploadResponse response = service.upload(userId, MediaUsage.PROFILE_AVATAR, file);

        ArgumentCaptor<BlobInfo> blobInfo = ArgumentCaptor.forClass(BlobInfo.class);
        verify(storage).create(blobInfo.capture(), any(byte[].class));
        assertThat(blobInfo.getValue().getBucket()).isEqualTo("brooks-media");
        assertThat(blobInfo.getValue().getName()).startsWith("profiles/" + userId + "/");
        assertThat(blobInfo.getValue().getName()).endsWith(".png");
        assertThat(blobInfo.getValue().getContentType()).isEqualTo("image/png");

        assertThat(response.getObjectName()).isEqualTo(blobInfo.getValue().getName());
        assertThat(response.getUrl()).startsWith("https://storage.googleapis.com/brooks-media/profiles/" + userId + "/");
        assertThat(response.getContentType()).isEqualTo("image/png");
        assertThat(response.getSizeBytes()).isEqualTo(3);
    }

    @Test
    void uploadRejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.gif",
                "image/gif",
                new byte[] {1}
        );

        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), MediaUsage.PROFILE_AVATAR, file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only JPEG, PNG, and WebP images are supported");
    }

    @Test
    void uploadRejectsMissingBucketConfig() {
        ReflectionTestUtils.setField(service, "bucketName", "");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.jpg",
                "image/jpeg",
                new byte[] {1}
        );

        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), MediaUsage.PROFILE_AVATAR, file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Media storage bucket is not configured");
    }
}
