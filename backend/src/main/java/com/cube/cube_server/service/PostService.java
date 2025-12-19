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
    public Long write(PostDto.Create request, String memberId) {
        Member member = memberRepository.findOne(memberId);
        if (member == null) {
            throw new IllegalArgumentException("존재하지 않는 회원입니다.");
        }

        Post post = request.toEntity();
        post.changeMember(member);

        postRepository.save(post);
        return post.getId();
    }

    public List<PostDto.Response> findAll() {
        return postRepository.findAllDesc().stream()
                .map(PostDto.Response::of)
                .collect(Collectors.toList());
    }

    public List<PostDto.Response> findByMemberId(String memberId) {
        return postRepository.findByMemberId(memberId).stream()
                .map(PostDto.Response::of)
                .collect(Collectors.toList());
    }

    public PostDto.Response findById(Long id) {
        Post post = postRepository.findOne(id);
        if (post == null) {
            throw new IllegalArgumentException("해당 게시글이 없습니다. id=" + id);
        }
        return PostDto.Response.of(post);
    }

    @Transactional
    public Long update(Long id, PostDto.Update request) {
        Post post = postRepository.findOne(id);
        if (post == null) {
            throw new IllegalArgumentException("해당 게시글이 없습니다. id=" + id);
        }

        post.update(request.getTitle(), request.getContent());

        return id;
    }

    @Transactional
    public void delete(Long id) {
        Post post = postRepository.findOne(id);
        if (post == null) {
            throw new IllegalArgumentException("해당 게시글이 없습니다. id=" + id);
        }
        postRepository.remove(post);
    }
}