package com.cube.cube_server.service;

import com.cube.cube_server.domain.Member;
import com.cube.cube_server.dto.MemberDto;
import com.cube.cube_server.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;

    @Transactional
    public String join(MemberDto memberDto) {
        validateDuplicateMember(memberDto.getId());

        Member member = memberDto.toEntity();
        memberRepository.save(member);

        return member.getId();
    }

    private void validateDuplicateMember(String id) {
        memberRepository.findById(id).ifPresent(m -> {
            throw new IllegalStateException("이미 존재하는 회원입니다.");
        });
    }

    public MemberDto login(String id, String password) {
        Member member = memberRepository.findById(id)
                .filter(m -> m.getPassword().equals(password))
                .orElse(null);

        if (member != null) {
            return new MemberDto(member);
        } else {
            return null;
        }
    }
}