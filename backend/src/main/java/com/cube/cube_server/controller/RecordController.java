package com.cube.cube_server.controller;

import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.service.RecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<String> addRecord(@RequestBody RecordDto.Create request, @RequestParam String memberId) {
        try {
            Long recordId = recordService.addRecord(request, memberId);
            return ResponseEntity.status(HttpStatus.CREATED).body("기록 저장 완료! ID: " + recordId);
        } catch (IllegalArgumentException e) {
            log.warn("기록 저장 실패(회원 없음): {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("기록 저장 중 서버 에러 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 오류: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getRecords(@RequestParam String memberId) {
        try {
            List<RecordDto.Response> records = recordService.getRecords(memberId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("기록 조회 중 서버 에러 발생 (MemberID: {})", memberId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 오류: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteRecord(@PathVariable Long id) {
        try {
            recordService.deleteRecord(id);
            return ResponseEntity.ok("기록 삭제 완료");
        } catch (Exception e) {
            log.error("기록 삭제 중 서버 에러 발생 (ID: {})", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 오류: " + e.getMessage());
        }
    }
}