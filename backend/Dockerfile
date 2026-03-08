# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S geotracker && adduser -S geotracker -G geotracker

COPY --from=build /app/target/*.jar app.jar

# Switch to non-root user
USER geotracker

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
