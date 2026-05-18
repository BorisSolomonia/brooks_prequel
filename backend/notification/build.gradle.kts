dependencies {
    implementation(project(":common"))
    implementation(project(":auth"))
    implementation(project(":user"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // Firebase Admin SDK — used to send FCM push notifications. Server-only,
    // never ships to the client. Auth via service-account JSON loaded from
    // a configurable filesystem path or env var (see FirebaseConfig).
    implementation("com.google.firebase:firebase-admin:9.4.3")
}
