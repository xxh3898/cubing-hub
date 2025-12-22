package com.cube.cube_server.controller;

import com.cube.cube_server.dto.MemberDto;
import com.cube.cube_server.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MemberController {

    private final MemberService memberService;

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody MemberDto.Create request) {
        try {
            String savedId = memberService.join(request);
            return ResponseEntity.status(HttpStatus.CREATED).body("회원가입 성공! ID: " + savedId);
        } catch (IllegalStateException e) {
            log.warn("회원가입 실패(중복): {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            log.error("회원가입 중 서버 에러 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 오류: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody MemberDto.LoginRequest request) {
        try {
            MemberDto.Response loginMember = memberService.login(request.getId(), request.getPassword());

            if (loginMember != null) {
                return ResponseEntity.ok(loginMember);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("로그인 실패: 아이디 또는 비밀번호가 일치하지 않습니다.");
            }
        } catch (Exception e) {
            log.error("로그인 중 서버 에러 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 오류: " + e.getMessage());
        }
    }
}