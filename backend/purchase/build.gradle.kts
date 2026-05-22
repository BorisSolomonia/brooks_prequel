dependencies {
    implementation(project(":common"))
    implementation(project(":auth"))
    implementation(project(":user"))
    implementation(project(":profile"))
    implementation(project(":guide"))
    // PurchaseService needs FollowRepository to short-circuit checkout when
    // a guide is in FREE_FOR_FOLLOWERS mode and the buyer already follows
    // the creator. See V54 migration + GuidePricingMode enum.
    implementation(project(":social"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    // Compile-time access to MeterRegistry/Counter/Timer for instrumentation.
    // The actual implementation comes from :app via spring-boot-starter-actuator.
    compileOnly("io.micrometer:micrometer-core")
    testImplementation("io.micrometer:micrometer-core")
}
