package com.brooks.user.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User extends BaseEntity {

    @Column(name = "auth0_subject", nullable = false, unique = true)
    private String auth0Subject;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "username", unique = true)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted = false;

    public User(String auth0Subject, String email) {
        this.auth0Subject = auth0Subject;
        this.email = email;
    }
}
