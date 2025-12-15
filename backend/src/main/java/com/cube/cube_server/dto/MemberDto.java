package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Member;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
public class MemberDto {
    private String id;
    private String password;
    private String name;
    private int age;

    public MemberDto(Member member) {
        this.id = member.getId();
        this.name = member.getName();
        this.age = member.getAge();
    }

    public Member toEntity() {
        return new Member(id, password, name, age);
    }
}