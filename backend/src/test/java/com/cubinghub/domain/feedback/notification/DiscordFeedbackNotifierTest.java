package com.cubinghub.domain.feedback.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("DiscordFeedbackNotifier 단위 테스트")
class DiscordFeedbackNotifierTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
        Thread.interrupted();
    }

    @Test
    @DisplayName("webhook URL이 비어 있으면 Discord 전송 실패 상태를 반환한다")
    void should_return_failure_result_when_webhook_url_is_blank() {
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "");

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("짧은 피드백 내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord 운영 알림 webhook URL이 설정되지 않았습니다.");
        assertThat(result.attemptedAt()).isNotNull();
    }

    @Test
    @DisplayName("내용이 길면 Discord 메시지를 잘라서 단일 webhook 요청으로 전송한다")
    void should_send_truncated_message_when_feedback_content_exceeds_discord_limit() throws Exception {
        AtomicReference<String> requestBodyRef = new AtomicReference<>();
        AtomicReference<String> queryRef = new AtomicReference<>();
        startServer(requestBodyRef, queryRef, 204);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "http://localhost:" + server.getAddress().getPort() + "/webhook");

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("가".repeat(2300)));

        assertThat(result.success()).isTrue();
        assertThat(result.errorMessage()).isNull();
        assertThat(queryRef.get()).contains("wait=true");

        JsonNode payload = objectMapper.readTree(requestBodyRef.get());
        assertThat(payload.get("allowed_mentions").get("parse").isEmpty()).isTrue();

        String content = payload.get("content").asText();
        assertThat(content).contains("[새 피드백]");
        assertThat(content).contains("feedbackId: 1");
        assertThat(content).contains("authorUserId: 10");
        assertThat(content).contains("authorNickname: FeedbackUser");
        assertThat(content).contains("본문이 길어 일부만 표시했습니다. 전체 내용은 DB에서 feedbackId 기준으로 확인하세요.");
        assertThat(content).doesNotContain("reply@cubinghub.com");
        assertThat(content).doesNotContain("feedback@cubinghub.com");
        assertThat(content.length()).isLessThanOrEqualTo(2000);
    }

    @Test
    @DisplayName("query string이 있는 webhook이 non-2xx를 반환하면 실패 상태를 반환한다")
    void should_return_failure_result_when_webhook_with_query_string_returns_non_2xx() throws Exception {
        AtomicReference<String> requestBodyRef = new AtomicReference<>();
        AtomicReference<String> queryRef = new AtomicReference<>();
        startServer(requestBodyRef, queryRef, 500);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(
                objectMapper,
                "http://localhost:" + server.getAddress().getPort() + "/webhook?token=abc"
        );

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord webhook 응답 실패 (500)");
        assertThat(queryRef.get()).contains("token=abc");
        assertThat(queryRef.get()).contains("wait=true");
        assertThat(requestBodyRef.get()).contains("\"content\"");
    }

    @Test
    @DisplayName("200 미만 상태코드를 반환해도 실패 상태를 반환한다")
    void should_return_failure_result_when_webhook_returns_status_code_below_200() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "https://discord.test/webhook");
        ReflectionTestUtils.setField(notifier, "httpClient", httpClient);
        when(response.statusCode()).thenReturn(199);
        when(httpClient.send(any(), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord webhook 응답 실패 (199)");
    }

    @Test
    @DisplayName("HTTP client가 IOException을 던지면 실패 상태를 반환한다")
    void should_return_failure_result_when_http_client_throws_io_exception() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "https://discord.test/webhook");
        ReflectionTestUtils.setField(notifier, "httpClient", httpClient);
        when(httpClient.send(any(), any(HttpResponse.BodyHandler.class))).thenThrow(new IOException("network"));

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord webhook 호출 실패: IOException");
    }

    @Test
    @DisplayName("HTTP client가 InterruptedException을 던지면 interrupt flag를 복구하고 실패 상태를 반환한다")
    void should_restore_interrupt_flag_when_http_client_throws_interrupted_exception() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "https://discord.test/webhook");
        ReflectionTestUtils.setField(notifier, "httpClient", httpClient);
        when(httpClient.send(any(), any(HttpResponse.BodyHandler.class))).thenThrow(new InterruptedException("interrupted"));

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord webhook 호출 실패: InterruptedException");
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    @DisplayName("payload 직렬화가 실패하면 요청 구성 실패 상태를 반환한다")
    void should_return_failure_result_when_payload_serialization_fails() throws Exception {
        ObjectMapper failingObjectMapper = mock(ObjectMapper.class);
        when(failingObjectMapper.writeValueAsString(any()))
                .thenThrow(new JsonProcessingException("boom") {
                });
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(failingObjectMapper, "https://discord.test/webhook");

        FeedbackNotificationAttemptResult result = notifier.send(createFeedback("내용"));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).isEqualTo("Discord webhook 요청 구성 실패: IllegalStateException");
    }

    @Test
    @DisplayName("제목과 닉네임이 너무 길면 Discord 메시지에서 줄여서 전송한다")
    void should_abbreviate_title_and_nickname_when_they_exceed_discord_field_limits() throws Exception {
        AtomicReference<String> requestBodyRef = new AtomicReference<>();
        AtomicReference<String> queryRef = new AtomicReference<>();
        startServer(requestBodyRef, queryRef, 204);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "http://localhost:" + server.getAddress().getPort() + "/webhook");

        Feedback feedback = createFeedback("내용");
        ReflectionTestUtils.setField(feedback, "title", "T".repeat(140));
        ReflectionTestUtils.setField(feedback.getUser(), "nickname", "N".repeat(150));
        ReflectionTestUtils.setField(feedback, "createdAt", LocalDateTime.of(2026, 4, 24, 14, 20, 30));

        FeedbackNotificationAttemptResult result = notifier.send(feedback);

        assertThat(result.success()).isTrue();
        JsonNode payload = objectMapper.readTree(requestBodyRef.get());
        String content = payload.get("content").asText();
        assertThat(content).contains("title: " + "T".repeat(97) + "...");
        assertThat(content).contains("authorNickname: " + "N".repeat(117) + "...");
        assertThat(content).contains("createdAt: 2026-04-24 14:20:30");
    }

    @Test
    @DisplayName("제목이나 닉네임이 null이어도 요청 본문 생성은 실패하지 않는다")
    void should_allow_null_title_and_nickname_when_building_request_body() throws Exception {
        AtomicReference<String> requestBodyRef = new AtomicReference<>();
        AtomicReference<String> queryRef = new AtomicReference<>();
        startServer(requestBodyRef, queryRef, 204);
        DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(objectMapper, "http://localhost:" + server.getAddress().getPort() + "/webhook");

        Feedback feedback = createFeedback("내용");
        ReflectionTestUtils.setField(feedback, "title", null);
        ReflectionTestUtils.setField(feedback.getUser(), "nickname", null);

        FeedbackNotificationAttemptResult result = notifier.send(feedback);

        assertThat(result.success()).isTrue();
        assertThat(requestBodyRef.get()).contains("\"content\"");
    }

    private void startServer(AtomicReference<String> requestBodyRef, AtomicReference<String> queryRef, int statusCode) throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook", exchange -> {
            requestBodyRef.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            queryRef.set(exchange.getRequestURI().getQuery());
            exchange.sendResponseHeaders(statusCode, -1);
            exchange.close();
        });
        server.start();
    }

    private Feedback createFeedback(String content) {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(
                        10L,
                        "feedback@cubinghub.com",
                        "FeedbackUser",
                        com.cubinghub.domain.user.entity.UserRole.ROLE_USER,
                        com.cubinghub.domain.user.entity.UserStatus.ACTIVE
                ))
                .type(FeedbackType.BUG)
                .title("긴 피드백 제목")
                .replyEmail("reply@cubinghub.com")
                .content(content)
                .build();
        ReflectionTestUtils.setField(feedback, "id", 1L);
        return feedback;
    }
}
