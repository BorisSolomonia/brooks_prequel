dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.core:jackson-databind")
    // GlobalExceptionHandler maps AccessDeniedException → 403. The class lives in
    // spring-security-core; modules that depend on common already pull security
    // transitively, so compileOnly keeps common itself security-free at runtime.
    compileOnly("org.springframework.security:spring-security-core")
}
