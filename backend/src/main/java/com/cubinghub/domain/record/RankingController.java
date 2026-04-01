package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RankingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RecordService recordService;

    @GetMapping
    public List<RankingResponse> getRankings(@RequestParam EventType eventType) {
        return recordService.getRankings(eventType);
    }
}
