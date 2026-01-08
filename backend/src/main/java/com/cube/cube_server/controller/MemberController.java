package com.cube.cube_server.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cube.cube_server.dto.MemberDto;
import com.cube.cube_server.service.MemberService;

import lombok.RequiredArgsConstructor;

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

    @GetMapping("/{memberId}")
    public ResponseEntity<MemberDto.Response> getMember(@PathVariable String memberId) {
        return ResponseEntity.ok(memberService.getMember(memberId));
    }

    @GetMapping("/me")
    public ResponseEntity<MemberDto.Response> getMe() {
        return ResponseEntity.ok(memberService.getMember(com.cube.cube_server.security.SecurityUtil.getCurrentMemberId()));
    }
}
