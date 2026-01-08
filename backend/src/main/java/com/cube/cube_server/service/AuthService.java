package com.cube.cube_server.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cube.cube_server.domain.Member;
import com.cube.cube_server.dto.AuthDto;
import com.cube.cube_server.repository.MemberRepository;
import com.cube.cube_server.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthDto.LoginResponse login(AuthDto.LoginRequest request) {
        // 1. 회원 조회
        Member member = memberRepository.findById(request.getId())
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다"));

        // 2. 비밀번호 확인
        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다");
        }

        // 3. JWT 토큰 생성
        String token = jwtTokenProvider.generateToken(member.getId(), "USER");

        // 4. 응답 생성
        return AuthDto.LoginResponse.builder()
                .token(token)
                .id(member.getId())
                .name(member.getName())
                .role("USER")
                .build();
    }
}
