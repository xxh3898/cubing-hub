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
    public ResponseEntity<String> signup(@RequestBody MemberDto memberDto) {
        try {
            String savedId = memberService.join(memberDto);
            return ResponseEntity.ok("회원가입 성공! ID: " + savedId);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<MemberDto> login(@RequestBody MemberDto memberDto) {
        MemberDto loginMember = memberService.login(memberDto.getId(), memberDto.getPassword());

        if (loginMember != null) {
            return ResponseEntity.ok(loginMember);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}