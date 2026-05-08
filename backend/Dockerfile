FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY common/ common/
COPY auth/ auth/
COPY user/ user/
COPY profile/ profile/
COPY social/ social/
COPY guide/ guide/
COPY memory/ memory/
COPY search/ search/
COPY purchase/ purchase/
COPY ai/ ai/
COPY app/ app/
RUN chmod +x gradlew && ./gradlew :app:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S brooks && adduser -S brooks -G brooks
COPY --from=build /app/app/build/libs/*.jar app.jar
RUN apk add --no-cache curl
USER brooks
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
# JVM defaults: 75% of container RAM as heap (instead of the 25% default), G1, fail-fast on OOM
# with a heap dump for debugging. JAVA_OPTS at runtime overrides everything.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
