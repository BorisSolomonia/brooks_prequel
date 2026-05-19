rootProject.name = "brooks-backend"

// Every Gradle subproject MUST have a matching directory on disk with
// its own build.gradle.kts. We assert this loudly here because of the
// silent-skip bug that hit production on 2026-05-19:
//
//   • settings.gradle.kts had include("notification")
//   • backend/Dockerfile didn't COPY notification/ into the build context
//   • Gradle saw the include but the directory didn't exist in the build
//     container — it SILENTLY skipped the module
//   • app/build.gradle.kts had implementation(project(":notification"))
//     which then resolved to nothing
//   • bootJar succeeded with the notification classes missing
//   • Every /api/me/notifications and /api/me/device-tokens request
//     returned 500 because no controller existed in the JAR
//
// The fix: hard-fail at gradle-config time if any included module's
// directory is missing. The same Dockerfile bug would now cause the
// docker build itself to fail at the gradle stage, with a clear error
// pointing at the missing directory.

val modules = listOf(
    "common",
    "auth",
    "user",
    "profile",
    "social",
    "guide",
    "memory",
    "search",
    "purchase",
    "ai",
    "notification",
    "app",
)

modules.forEach { name ->
    val dir = file(name)
    if (!dir.exists() || !dir.isDirectory) {
        throw GradleException(
            "Subproject directory missing: '$name'. " +
            "settings.gradle.kts is trying to include ':$name' but $dir does not exist. " +
            "If you added a new module, also add a matching `COPY $name/ $name/` " +
            "line to backend/Dockerfile so the directory makes it into the docker " +
            "build context. If you removed a module, remove its entry from the " +
            "modules list above."
        )
    }
    val buildFile = file("$name/build.gradle.kts")
    if (!buildFile.exists()) {
        throw GradleException(
            "Subproject '$name' is present but $buildFile does not exist. " +
            "Every Gradle subproject needs a build.gradle.kts."
        )
    }
    include(name)
}
