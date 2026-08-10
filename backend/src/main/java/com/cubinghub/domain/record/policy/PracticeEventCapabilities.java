package com.cubinghub.domain.record.policy;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.entity.EventType;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PracticeEventCapabilities {

    public static final String UNSUPPORTED_EVENT_MESSAGE = "지원하지 않는 Practice 종목입니다.";

    private final Map<EventType, PracticeEventCapability> capabilities;

    public PracticeEventCapabilities() {
        EnumMap<EventType, PracticeEventCapability> configured = new EnumMap<>(EventType.class);
        configured.put(
                EventType.WCA_333,
                new PracticeEventCapability(
                        EventType.WCA_333,
                        ResultKind.TIME,
                        true,
                        true,
                        true,
                        true
                )
        );
        capabilities = Collections.unmodifiableMap(configured);
    }

    public Optional<PracticeEventCapability> get(EventType eventType) {
        return Optional.ofNullable(capabilities.get(eventType));
    }

    public void requireScrambleSupported(EventType eventType) {
        requireSupported(eventType, PracticeEventCapability::scrambleSupported);
    }

    public void requirePracticeRecordSupported(EventType eventType) {
        requireSupported(eventType, PracticeEventCapability::practiceRecordSupported);
    }

    public void requirePracticeRankingSupported(EventType eventType) {
        requireSupported(eventType, PracticeEventCapability::practiceRankingSupported);
    }

    private void requireSupported(
            EventType eventType,
            Predicate<PracticeEventCapability> supportPredicate
    ) {
        PracticeEventCapability capability = capabilities.get(eventType);
        if (capability == null || !supportPredicate.test(capability)) {
            throw new CustomApiException(UNSUPPORTED_EVENT_MESSAGE, HttpStatus.BAD_REQUEST);
        }
    }
}
