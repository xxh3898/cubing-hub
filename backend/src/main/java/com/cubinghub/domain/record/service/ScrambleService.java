package com.cubinghub.domain.record.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.common.util.ScrambleGenerator;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ScrambleService {

    private static final Set<EventType> SUPPORTED_EVENT_TYPES = EnumSet.of(
            EventType.WCA_333
    );

    public ScrambleResponse generate(EventType eventType) {
        if (!SUPPORTED_EVENT_TYPES.contains(eventType)) {
            throw new CustomApiException("아직 구현되지 않은 종목입니다.", HttpStatus.BAD_REQUEST);
        }

        return new ScrambleResponse(eventType.name(), ScrambleGenerator.generate(eventType));
    }

    public ScrambleResponse generateDaily(EventType eventType, LocalDate date) {
        if (!SUPPORTED_EVENT_TYPES.contains(eventType)) {
            throw new CustomApiException("아직 구현되지 않은 종목입니다.", HttpStatus.BAD_REQUEST);
        }

        return new ScrambleResponse(eventType.name(), ScrambleGenerator.generateDaily(eventType, date));
    }
}
