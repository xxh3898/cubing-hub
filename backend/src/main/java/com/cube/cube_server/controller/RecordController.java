package com.cube.cube_server.controller;

import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.service.RecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<String> addRecord(@RequestBody RecordDto recordDto, @RequestParam String memberId) {
        Long recordId = recordService.addRecord(recordDto, memberId);
        return ResponseEntity.ok("기록 저장 완료! ID: " + recordId);
    }

    @GetMapping
    public ResponseEntity<List<RecordDto>> getRecords(@RequestParam String memberId) {
        List<RecordDto> records = recordService.getRecords(memberId);
        return ResponseEntity.ok(records);
    }
}