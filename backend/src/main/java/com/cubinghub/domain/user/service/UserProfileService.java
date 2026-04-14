package com.cubinghub.domain.user.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.dto.response.MyRecordPageResponse;
import com.cubinghub.domain.user.dto.response.MyProfileRecordResponse;
import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import com.cubinghub.domain.user.dto.response.MyProfileSummaryResponse;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserRepository userRepository;
    private final RecordRepository recordRepository;

    public MyProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
        List<Record> records = recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        return new MyProfileResponse(
                user.getId(),
                user.getNickname(),
                user.getMainEvent(),
                buildSummary(records)
        );
    }

    public MyRecordPageResponse getMyRecords(String email, Integer page, Integer size) {
        validatePageRequest(page, size);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
        Page<Record> records = recordRepository.findByUserIdOrderByCreatedAtDesc(
                user.getId(),
                PageRequest.of(page - 1, size)
        );
        List<MyProfileRecordResponse> items = new ArrayList<>(records.getNumberOfElements());

        for (Record record : records.getContent()) {
            items.add(MyProfileRecordResponse.from(record));
        }

        return new MyRecordPageResponse(
                items,
                page,
                size,
                records.getTotalElements(),
                records.getTotalPages(),
                records.hasNext(),
                records.hasPrevious()
        );
    }

    private MyProfileSummaryResponse buildSummary(List<Record> records) {
        List<Integer> effectiveTimes = records.stream()
                .map(Record::getEffectiveTimeMs)
                .filter(Objects::nonNull)
                .toList();

        Integer personalBestTimeMs = effectiveTimes.stream()
                .min(Integer::compareTo)
                .orElse(null);
        Integer averageTimeMs = effectiveTimes.isEmpty()
                ? null
                : (int) Math.round(effectiveTimes.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0));

        return new MyProfileSummaryResponse(records.size(), personalBestTimeMs, averageTimeMs);
    }

    private void validatePageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("page는 1 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("size는 1 이상 100 이하여야 합니다.");
        }
    }
}
