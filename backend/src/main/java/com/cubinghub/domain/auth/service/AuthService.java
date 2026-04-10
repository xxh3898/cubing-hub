package com.cubinghub.domain.auth.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.auth.dto.LoginRequest;
import com.cubinghub.domain.auth.dto.SignUpRequest;
import com.cubinghub.domain.auth.dto.TokenDto;
import com.cubinghub.domain.auth.service.blacklist.RedisBlackListService;
import com.cubinghub.domain.auth.service.token.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final RedisBlackListService redisBlackListService;

    @Transactional
    public void signUp(SignUpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomApiException("이미 사용중인 이메일입니다.", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByNickname(request.getNickname())) {
            throw new CustomApiException("이미 사용중인 닉네임입니다.", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent(request.getMainEvent())
                .build();

        userRepository.save(user);
        log.info("새로운 사용자 가입 완료: {}", user.getEmail());
    }

    @Transactional
    public TokenDto login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new CustomApiException("이메일 또는 비밀번호가 일치하지 않습니다.", HttpStatus.UNAUTHORIZED);
        }

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CustomApiException("이메일 또는 비밀번호가 일치하지 않습니다.", HttpStatus.UNAUTHORIZED));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new CustomApiException("활성화된 계정이 아닙니다.", HttpStatus.FORBIDDEN);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails.getUsername());
        String jti = jwtTokenProvider.getJti(refreshToken);

        refreshTokenService.save(userDetails.getUsername(), jti, refreshToken, jwtTokenProvider.getRefreshTokenExpirationMs());
        return new TokenDto(accessToken, refreshToken);
    }

    @Transactional
    public TokenDto refresh(String reqRefreshToken) {
        if (!jwtTokenProvider.validateToken(reqRefreshToken)) {
            throw new CustomApiException("유효하지 않거나 만료된 리프레시 토큰입니다.", HttpStatus.UNAUTHORIZED);
        }

        String email = jwtTokenProvider.getEmail(reqRefreshToken);
        String jti = jwtTokenProvider.getJti(reqRefreshToken);

        if (!refreshTokenService.isValid(email, jti, reqRefreshToken)) {
            refreshTokenService.deleteAllByUser(email);
            throw new CustomApiException("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.", HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new CustomApiException("활성화된 계정이 아닙니다.", HttpStatus.FORBIDDEN);
        }

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRole().name())
                .build();

        refreshTokenService.delete(email, jti);

        String newAccessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email);
        String newJti = jwtTokenProvider.getJti(newRefreshToken);
        refreshTokenService.save(email, newJti, newRefreshToken, jwtTokenProvider.getRefreshTokenExpirationMs());

        return new TokenDto(newAccessToken, newRefreshToken);
    }

    @Transactional
    public void logout(String refreshToken, String accessToken) {
        if (refreshToken != null) {
            try {
                String email = jwtTokenProvider.getEmail(refreshToken);
                String jti = jwtTokenProvider.getJti(refreshToken);
                refreshTokenService.delete(email, jti);
            } catch (Exception e) {
                log.warn("Refresh Token 파싱 실패: {}", e.getMessage());
            }
        }

        if (accessToken != null) {
            try {
                redisBlackListService.setBlackList(accessToken, jwtTokenProvider.getRemainingExpiration(accessToken));
            } catch (Exception e) {
                log.warn("Access Token 블랙리스트 등록 스킵: {}", e.getMessage());
            }
        }
    }
}
