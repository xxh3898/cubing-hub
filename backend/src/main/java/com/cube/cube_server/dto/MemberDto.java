package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Member;
import lombok.*;

public class MemberDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        private String id;
        private String password;
        private String name;
        private Integer age;

        public Member toEntity() {
            return Member.builder()
                    .id(id)
                    .password(password)
                    .name(name)
                    .age(age)
                    .build();
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String id;
        private String password;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private String id;
        private String name;
        private Integer age;

        public static Response of(Member member) {
            return Response.builder()
                    .id(member.getId())
                    .name(member.getName())
                    .age(member.getAge())
                    .build();
        }
    }
}