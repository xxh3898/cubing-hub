package com.cube.cube_server.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.cube.cube_server.domain.Member;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
        private String level;
        private List<AchievementResponse> achievements;

        public static Response of(Member member) {
            return Response.builder()
                    .id(member.getId())
                    .name(member.getName())
                    .age(member.getAge())
                    .level(member.getLevel())
                    .achievements(member.getAchievements().stream()
                            .map(AchievementResponse::of)
                            .collect(Collectors.toList()))
                    .build();
        }
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AchievementResponse {

        private String type;
        private String name;
        private String description;
        private LocalDateTime achievedDate;

        public static AchievementResponse of(com.cube.cube_server.domain.MemberAchievement achievement) {
            return AchievementResponse.builder()
                    .type(achievement.getAchievementType().name())
                    .name(achievement.getAchievementType().getName())
                    .description(achievement.getAchievementType().getDescription())
                    .achievedDate(achievement.getAchievedDate())
                    .build();
        }
    }
}
