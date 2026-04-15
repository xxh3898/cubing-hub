package com.cubinghub.domain.home.dto.response;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import java.util.List;
import lombok.Getter;

@Getter
public class HomeResponse {

    private final ScrambleResponse todayScramble;
    private final HomeSummaryResponse summary;
    private final List<HomeRecentRecordResponse> recentRecords;
    private final List<PostListItemResponse> recentPosts;

    public HomeResponse(
            ScrambleResponse todayScramble,
            HomeSummaryResponse summary,
            List<HomeRecentRecordResponse> recentRecords,
            List<PostListItemResponse> recentPosts
    ) {
        this.todayScramble = todayScramble;
        this.summary = summary;
        this.recentRecords = recentRecords;
        this.recentPosts = recentPosts;
    }
}
