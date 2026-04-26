package com.brooks.user.service;

import com.brooks.auth.service.UserRoleProvider;
import com.brooks.user.domain.UserRole;
import com.brooks.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleProviderImpl implements UserRoleProvider {

    private final UserRepository userRepository;

    @Override
    public Collection<GrantedAuthority> getAuthoritiesForSubject(String subject) {
        return userRepository.findByAuth0Subject(subject)
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(u -> (Collection<GrantedAuthority>) List.<GrantedAuthority>of(
                        new SimpleGrantedAuthority("ROLE_ADMIN"),
                        new SimpleGrantedAuthority("ROLE_USER")))
                .orElse(List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}
