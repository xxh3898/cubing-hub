package com.cube.cube_server.controller;

import com.cube.cube_server.dto.MemberDto;
import com.cube.cube_server.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            return ResponseEntity.ok("회원가입 성공! ID: " + savedId);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<MemberDto.Response> login(@RequestBody MemberDto.LoginRequest request) {
        MemberDto.Response loginMember = memberService.login(request.getId(), request.getPassword());

        if (loginMember != null) {
            return ResponseEntity.ok(loginMember);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}