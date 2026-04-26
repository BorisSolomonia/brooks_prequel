package com.brooks.auth.service;

import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

public interface UserRoleProvider {
    Collection<GrantedAuthority> getAuthoritiesForSubject(String subject);
}
