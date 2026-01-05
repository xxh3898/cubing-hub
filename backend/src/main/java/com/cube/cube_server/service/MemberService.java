package com.cube.cube_server.service;

import com.cube.cube_server.domain.Member;
import com.cube.cube_server.dto.MemberDto;
import com.cube.cube_server.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public String join(MemberDto.Create request) {
        validateDuplicateMember(request.getId());

        Member member = Member.builder()
                .id(request.getId())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .age(request.getAge())
                .build();

        memberRepository.save(member);

        return member.getId();
    }

    private void validateDuplicateMember(String id) {
        memberRepository.findById(id).ifPresent(m -> {
            throw new IllegalStateException("이미 존재하는 회원입니다.");
        });
    }

    // login method removed as it is replaced by AuthService
}