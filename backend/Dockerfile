FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

ARG JAR_FILE=build/libs/cubing-hub-0.0.1-SNAPSHOT.jar

RUN useradd --system --create-home --shell /usr/sbin/nologin spring

COPY ${JAR_FILE} app.jar

RUN chown spring:spring /app/app.jar

USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]
