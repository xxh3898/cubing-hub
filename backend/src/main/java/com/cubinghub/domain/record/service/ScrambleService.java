package com.cubinghub.domain.record.service;

import com.cubinghub.common.util.ScrambleGenerator;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.policy.PracticeEventCapabilities;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ScrambleService {

    private final PracticeEventCapabilities eventCapabilities;

    public ScrambleResponse generate(EventType eventType) {
        eventCapabilities.requireScrambleSupported(eventType);

        return new ScrambleResponse(eventType.name(), ScrambleGenerator.generate(eventType));
    }

    public ScrambleResponse generateDaily(EventType eventType, LocalDate date) {
        eventCapabilities.requireScrambleSupported(eventType);

        return new ScrambleResponse(eventType.name(), ScrambleGenerator.generateDaily(eventType, date));
    }
}
