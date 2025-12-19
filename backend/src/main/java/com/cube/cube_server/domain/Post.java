package com.cube.cube_server.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "POSTS")
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Lob
    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "author", nullable = false)
    private String author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Builder
    public Post(String title, String content, Member member) {
        this.title = title;
        this.content = content;

        if (member != null) {
            changeMember(member);
        }
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void changeMember(Member member) {
        this.member = member;
        this.author = member.getName();

        if (!member.getPosts().contains(this)) {
            member.getPosts().add(this);
        }
    }

    public String getAuthorId() {
        return this.member != null ? this.member.getId() : null;
    }
}