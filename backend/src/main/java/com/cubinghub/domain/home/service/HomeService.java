package com.cubinghub.domain.home.service;

import com.cubinghub.domain.home.dto.response.HomeRecentRecordResponse;
import com.cubinghub.domain.home.dto.response.HomeResponse;
import com.cubinghub.domain.home.dto.response.HomeSummaryResponse;
import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.service.ScrambleService;
import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import com.cubinghub.domain.user.service.UserProfileService;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeService {

    private static final int RECENT_RECORD_LIMIT = 5;
    private static final int RECENT_POST_LIMIT = 3;

    private final ScrambleService scrambleService;
    private final UserProfileService userProfileService;
    private final RecordRepository recordRepository;
    private final PostRepository postRepository;

    public HomeResponse getHome(String email) {
        ScrambleResponse todayScramble = scrambleService.generate(EventType.WCA_333);
        List<PostListItemResponse> recentPosts = postRepository.findRecent(RECENT_POST_LIMIT);

        if (!StringUtils.hasText(email)) {
            return new HomeResponse(todayScramble, null, Collections.emptyList(), recentPosts);
        }

        MyProfileResponse profile = userProfileService.getMyProfile(email);
        List<HomeRecentRecordResponse> recentRecords = recordRepository.findByUserIdOrderByCreatedAtDesc(
                        profile.getUserId(),
                        PageRequest.of(0, RECENT_RECORD_LIMIT)
                ).getContent().stream()
                .map(HomeRecentRecordResponse::from)
                .toList();

        return new HomeResponse(
                todayScramble,
                HomeSummaryResponse.from(profile),
                recentRecords,
                recentPosts
        );
    }
}
