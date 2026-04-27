package com.brooks.user.service;

import com.brooks.user.domain.User;
import com.brooks.user.domain.UserRole;
import com.brooks.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
        ReflectionTestUtils.setField(userService, "adminEmails", List.of("borissolomoniaphone@gmail.com"));
    }

    @Test
    void findOrCreateUserPromotesExistingConfiguredAdminEmail() {
        User existing = new User("auth0|admin", "borissolomoniaphone@gmail.com");
        existing.setRole(UserRole.USER);
        when(userRepository.findByAuth0Subject("auth0|admin")).thenReturn(Optional.of(existing));

        User result = userService.findOrCreateUser("auth0|admin", "borissolomoniaphone@gmail.com");

        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void findOrCreateUserCreatesConfiguredAdminAsAdmin() {
        when(userRepository.findByAuth0Subject("auth0|admin")).thenReturn(Optional.empty());
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.findOrCreateUser("auth0|admin", "borissolomoniaphone@gmail.com");

        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
        verify(userRepository).save(result);
    }
}
