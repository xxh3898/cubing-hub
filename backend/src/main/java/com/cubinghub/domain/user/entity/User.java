package com.cubinghub.domain.user.entity;

import com.cubinghub.common.BaseTimeEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @NotBlank
    @Size(min = 2, max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String nickname;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(length = 50)
    private String mainEvent;

    @Builder
    public User(String email, String password, String nickname, UserRole role, UserStatus status, String mainEvent) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
        this.status = status;
        this.mainEvent = mainEvent;
    }

    public void updateProfile(String nickname, String mainEvent) {
        this.nickname = nickname;
        this.mainEvent = mainEvent;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}
