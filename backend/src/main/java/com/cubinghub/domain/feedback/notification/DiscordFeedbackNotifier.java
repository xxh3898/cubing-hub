package com.cubinghub.domain.feedback.notification;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DiscordFeedbackNotifier {

    private static final int MAX_DISCORD_CONTENT_LENGTH = 2000;
    private static final String TRUNCATED_CONTENT_SUFFIX = "\n\n본문이 길어 일부만 표시했습니다. 전체 내용은 DB에서 feedbackId 기준으로 확인하세요.";
    private static final DateTimeFormatter CREATED_AT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String webhookUrl;

    public DiscordFeedbackNotifier(
            ObjectMapper objectMapper,
            @Value("${feedback.discord.webhook-url:}") String webhookUrl
    ) {
        this.objectMapper = objectMapper;
        this.webhookUrl = webhookUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public FeedbackNotificationAttemptResult send(Feedback feedback) {
        LocalDateTime attemptedAt = LocalDateTime.now();

        if (!StringUtils.hasText(webhookUrl)) {
            return FeedbackNotificationAttemptResult.failure(attemptedAt, "Discord 운영 알림 webhook URL이 설정되지 않았습니다.");
        }

        try {
            String requestBody = buildRequestBody(feedback);
            HttpRequest request = HttpRequest.newBuilder(URI.create(buildWebhookUrl()))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();

            if (statusCode >= 200 && statusCode < 300) {
                return FeedbackNotificationAttemptResult.success(attemptedAt);
            }

            return FeedbackNotificationAttemptResult.failure(attemptedAt, "Discord webhook 응답 실패 (" + statusCode + ")");
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            return FeedbackNotificationAttemptResult.failure(
                    attemptedAt,
                    "Discord webhook 호출 실패: " + e.getClass().getSimpleName()
            );
        } catch (RuntimeException e) {
            return FeedbackNotificationAttemptResult.failure(
                    attemptedAt,
                    "Discord webhook 요청 구성 실패: " + e.getClass().getSimpleName()
            );
        }
    }

    private String buildWebhookUrl() {
        if (webhookUrl.contains("?")) {
            return webhookUrl + "&wait=true";
        }

        return webhookUrl + "?wait=true";
    }

    private String buildRequestBody(Feedback feedback) {
        Map<String, Object> payload = Map.of(
                "content", buildDiscordMessage(feedback),
                "allowed_mentions", Map.of("parse", List.of())
        );

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Discord webhook payload 직렬화에 실패했습니다.", e);
        }
    }

    private String buildDiscordMessage(Feedback feedback) {
        String title = abbreviate(feedback.getTitle(), 100);
        String authorNickname = abbreviate(feedback.getUser().getNickname(), 120);
        String createdAt = feedback.getCreatedAt() == null ? "-" : feedback.getCreatedAt().format(CREATED_AT_FORMATTER);

        String header = """
                [새 피드백]
                feedbackId: %d
                type: %s
                title: %s
                authorUserId: %d
                authorNickname: %s
                createdAt: %s
                content:
                """.formatted(
                feedback.getId(),
                feedback.getType().name(),
                title,
                feedback.getUser().getId(),
                authorNickname,
                createdAt
        );

        String content = feedback.getContent();

        if (header.length() + content.length() <= MAX_DISCORD_CONTENT_LENGTH) {
            return header + content;
        }

        int availableContentLength = MAX_DISCORD_CONTENT_LENGTH - header.length() - TRUNCATED_CONTENT_SUFFIX.length();

        if (availableContentLength <= 0) {
            return header.substring(0, MAX_DISCORD_CONTENT_LENGTH - TRUNCATED_CONTENT_SUFFIX.length()) + TRUNCATED_CONTENT_SUFFIX;
        }

        return header + content.substring(0, availableContentLength) + TRUNCATED_CONTENT_SUFFIX;
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }

        return value.substring(0, Math.max(0, maxLength - 3)) + "...";
    }
}
