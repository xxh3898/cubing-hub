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
@CrossOrigin(origins = "*")
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<String> addRecord(@RequestBody RecordDto.Create request, @RequestParam String memberId) {
        Long recordId = recordService.addRecord(request, memberId);
        return ResponseEntity.ok("기록 저장 완료! ID: " + recordId);
    }

    @GetMapping
    public ResponseEntity<List<RecordDto.Response>> getRecords(@RequestParam String memberId) {
        return ResponseEntity.ok(recordService.getRecords(memberId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteRecord(@PathVariable Long id) {
        recordService.deleteRecord(id);
        return ResponseEntity.ok("기록 삭제 완료");
    }
}