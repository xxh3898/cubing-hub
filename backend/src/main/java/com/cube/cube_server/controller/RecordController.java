package com.cube.cube_server.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.service.RecordService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<String> addRecord(@RequestBody RecordDto.Create request, @AuthenticationPrincipal String memberId) {
        Long recordId = recordService.addRecord(request, memberId);
        return ResponseEntity.ok("기록 저장 완료! ID: " + recordId);
    }

    @GetMapping
    public ResponseEntity<List<RecordDto.Response>> getRecords(@AuthenticationPrincipal String memberId) {
        return ResponseEntity.ok(recordService.getRecords(memberId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteRecord(@PathVariable Long id) {
        recordService.deleteRecord(id);
        return ResponseEntity.ok("기록 삭제 완료");
    }
}
