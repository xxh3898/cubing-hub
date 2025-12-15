package com.cube.cube_server.service;

import com.cube.cube_server.domain.Member;
import com.cube.cube_server.domain.Post;
import com.cube.cube_server.dto.PostDto;
import com.cube.cube_server.repository.MemberRepository;
import com.cube.cube_server.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public Long write(PostDto postDto, String memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Post post = new Post(postDto.getTitle(), postDto.getContent(), member.getName());

        post.setMember(member);

        postRepository.save(post);

        return post.getId();
    }

    public List<PostDto> findAll() {
        return postRepository.findAllByOrderByCreateTimeDesc().stream()
                .map(PostDto::new)
                .collect(Collectors.toList());
    }

    public List<PostDto> findByMemberId(String memberId) {
        return postRepository.findAllByOrderByCreateTimeDesc().stream()
                .filter(p -> p.getMember().getId().equals(memberId))
                .map(PostDto::new)
                .collect(Collectors.toList());
    }
}