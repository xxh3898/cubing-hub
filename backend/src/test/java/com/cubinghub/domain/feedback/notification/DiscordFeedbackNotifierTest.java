package com.cubinghub.domain.feedback.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
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
        startServer(requestBodyRef, queryRef);
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
        assertThat(content).contains("본문이 길어 일부만 표시했습니다. 전체 내용은 DB에서 feedbackId 기준으로 확인하세요.");
        assertThat(content.length()).isLessThanOrEqualTo(2000);
    }

    private void startServer(AtomicReference<String> requestBodyRef, AtomicReference<String> queryRef) throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook", exchange -> {
            requestBodyRef.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            queryRef.set(exchange.getRequestURI().getQuery());
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();
    }

    private Feedback createFeedback(String content) {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(10L, "feedback@cubinghub.com", "FeedbackUser", com.cubinghub.domain.user.entity.UserRole.ROLE_USER, com.cubinghub.domain.user.entity.UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("긴 피드백 제목")
                .replyEmail("reply@cubinghub.com")
                .content(content)
                .build();
        ReflectionTestUtils.setField(feedback, "id", 1L);
        return feedback;
    }
}
