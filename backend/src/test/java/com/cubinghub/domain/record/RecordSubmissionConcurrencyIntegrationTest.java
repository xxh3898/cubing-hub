package com.cubinghub.domain.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.cubinghub.TestcontainersConfiguration;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordCreateResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.record.service.RankingRedisService;
import com.cubinghub.domain.record.service.RecordSubmissionService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@DisplayName("Record submission 동시성 통합 테스트")
class RecordSubmissionConcurrencyIntegrationTest {

    @Autowired
    private RecordSubmissionService submissionService;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private RankingRedisService rankingRedisService;

    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @AfterEach
    void tearDown() throws InterruptedException {
        executor.shutdownNow();
        executor.awaitTermination(5, TimeUnit.SECONDS);
        userPBRepository.deleteAll();
        recordRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("동일 사용자의 동시 duplicate submission은 Record와 PB side effect를 한 번만 만든다")
    void should_create_one_record_and_one_pb_when_same_submission_is_concurrent() throws Exception {
        User user = userRepository.saveAndFlush(User.builder()
                .email("concurrent@cubinghub.com")
                .password("password")
                .nickname("Concurrent")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(12345)
                .penalty(Penalty.NONE)
                .scramble("R U R' U'")
                .inputMethod(InputMethod.KEYBOARD)
                .clientSubmissionId(UUID.fromString("d9428888-122b-4d3e-a58e-790c4e5f97ad"))
                .build();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Future<RecordCreateResponse> first = submitConcurrently(user.getEmail(), request, ready, start);
        Future<RecordCreateResponse> second = submitConcurrently(user.getEmail(), request, ready, start);
        assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
        start.countDown();

        RecordCreateResponse firstResponse = first.get(10, TimeUnit.SECONDS);
        RecordCreateResponse secondResponse = second.get(10, TimeUnit.SECONDS);

        assertThat(firstResponse.getId()).isEqualTo(secondResponse.getId());
        assertThat(recordRepository.count()).isEqualTo(1);
        assertThat(userPBRepository.count()).isEqualTo(1);
        verify(rankingRedisService, times(1)).sync(any());
    }

    private Future<RecordCreateResponse> submitConcurrently(
            String email,
            RecordSaveRequest request,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return executor.submit(() -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("concurrent submission start timed out");
            }
            return submissionService.submit(email, request);
        });
    }
}
