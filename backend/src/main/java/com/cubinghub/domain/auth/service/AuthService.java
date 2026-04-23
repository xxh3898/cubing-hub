package com.cubinghub.domain.auth.service;

import com.cubinghub.config.AuthEmailVerificationProperties;
import com.cubinghub.domain.auth.dto.request.EmailVerificationConfirmRequest;
import com.cubinghub.domain.auth.dto.request.EmailVerificationRequest;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.PasswordResetConfirmRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.dto.response.CurrentUserResponse;
import com.cubinghub.domain.auth.repository.EmailVerificationStore;
import com.cubinghub.domain.auth.repository.PasswordResetStore;
import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.AuthenticationException;
import com.cubinghub.common.exception.CustomApiException;
import org.springframework.http.HttpStatus;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final RedisBlackListService redisBlackListService;
    private final EmailVerificationStore emailVerificationStore;
    private final PasswordResetStore passwordResetStore;
    private final EmailVerificationCodeGenerator emailVerificationCodeGenerator;
    private final VerificationEmailSender verificationEmailSender;
    private final AuthEmailVerificationProperties authEmailVerificationProperties;

    public void requestEmailVerification(EmailVerificationRequest request) {
        String email = request.getEmail();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 사용중인 이메일입니다.");
        }
        if (emailVerificationStore.isOnCooldown(email)) {
            throw new IllegalArgumentException(resendCooldownMessage());
        }

        String code = emailVerificationCodeGenerator.generate();
        emailVerificationStore.saveCode(email, code, authEmailVerificationProperties.getCodeExpirationMs());
        emailVerificationStore.saveCooldown(email, authEmailVerificationProperties.getResendCooldownMs());

        try {
            verificationEmailSender.sendVerificationCode(email, code);
        } catch (RuntimeException e) {
            emailVerificationStore.deleteCode(email);
            emailVerificationStore.deleteCooldown(email);
            log.error("이메일 인증 메일 발송 실패 - email: {}", email, e);
            throw new IllegalStateException("인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        log.info("이메일 인증번호 발송 완료: {}", email);
    }

    public void requestPasswordReset(EmailVerificationRequest request) {
        String email = request.getEmail();

        if (!userRepository.existsByEmail(email)) {
            log.info("비밀번호 재설정 요청 - 존재하지 않는 이메일: {}", email);
            return;
        }
        if (passwordResetStore.isOnCooldown(email)) {
            throw new IllegalArgumentException(resendCooldownMessage());
        }

        String code = emailVerificationCodeGenerator.generate();
        passwordResetStore.saveCode(email, code, authEmailVerificationProperties.getCodeExpirationMs());
        passwordResetStore.saveCooldown(email, authEmailVerificationProperties.getResendCooldownMs());

        try {
            verificationEmailSender.sendPasswordResetCode(email, code);
        } catch (RuntimeException e) {
            passwordResetStore.deleteCode(email);
            passwordResetStore.deleteCooldown(email);
            log.error("비밀번호 재설정 메일 발송 실패 - email: {}", email, e);
            throw new IllegalStateException("비밀번호 재설정 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        log.info("비밀번호 재설정 인증번호 발송 완료: {}", email);
    }

    public void confirmEmailVerification(EmailVerificationConfirmRequest request) {
        String email = request.getEmail();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 사용중인 이메일입니다.");
        }

        String storedCode = emailVerificationStore.getCode(email);
        if (storedCode == null) {
            throw new IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다.");
        }
        if (!storedCode.equals(request.getCode())) {
            throw new IllegalArgumentException("인증번호가 일치하지 않습니다.");
        }

        emailVerificationStore.deleteCode(email);
        emailVerificationStore.markVerified(email, authEmailVerificationProperties.getVerifiedExpirationMs());
        log.info("이메일 인증 완료: {}", email);
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        String email = request.getEmail();
        String storedCode = passwordResetStore.getCode(email);

        if (storedCode == null) {
            throw new IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다.");
        }
        if (!storedCode.equals(request.getCode())) {
            throw new IllegalArgumentException("인증번호가 일치하지 않습니다.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("인증번호가 만료되었거나 요청되지 않았습니다."));

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        passwordResetStore.deleteCode(email);
        passwordResetStore.deleteCooldown(email);
        refreshTokenService.deleteAllByUser(email);
        log.info("비밀번호 재설정 완료: {}", email);
    }

    /**
     * 회원가입
     */
    @Transactional
    public void signUp(SignUpRequest request) {
        if (!emailVerificationStore.isVerified(request.getEmail())) {
            throw new IllegalArgumentException("이메일 인증이 필요합니다.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용중인 이메일입니다.");
        }
        if (userRepository.existsByNickname(request.getNickname())) {
            throw new IllegalArgumentException("이미 사용중인 닉네임입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent(request.getMainEvent())
                .build();

        try {
            userRepository.saveAndFlush(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new org.springframework.dao.DataIntegrityViolationException("중복된 이메일 또는 닉네임입니다.");
        }
        emailVerificationStore.clearVerified(user.getEmail());
        log.info("새로운 사용자 가입 완료: {}", user.getEmail());
    }

    /**
     * 로그인
     */
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
            throw new IllegalStateException("활성화된 계정이 아닙니다.");
        }

        // 토큰 발급
        String accessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails.getUsername());

        String jti = jwtTokenProvider.getJti(refreshToken);

        // Redis에 Refresh Token 저장
        refreshTokenService.save(
                userDetails.getUsername(),
                jti,
                refreshToken, 
                jwtTokenProvider.getRefreshTokenExpirationMs()
        );

        log.info("로그인 성공: {}", userDetails.getUsername());

        return new TokenDto(accessToken, refreshToken);
    }

    /**
     * 토큰 갱신
     */
    public TokenDto refresh(String reqRefreshToken) {

        // 1. 토큰 자체의 유효성 검증
        if (!jwtTokenProvider.validateToken(reqRefreshToken)) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 리프레시 토큰입니다.");
        }

        // 2. 토큰에서 사용자 이메일, jti 추출
        String email = jwtTokenProvider.getEmail(reqRefreshToken);
        String jti = jwtTokenProvider.getJti(reqRefreshToken);

        // 3. Redis에 저장된 토큰과 일치하는지 검증
        if (!refreshTokenService.isValid(email, jti, reqRefreshToken)) {
            // 비정상적 토큰 재사용 감지 시 해당 사용자의 모든 Refresh Token 즉각 파기
            refreshTokenService.deleteAllByUser(email);
            throw new CustomApiException("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.", HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("활성화된 계정이 아닙니다.");
        }

        // Spring Security UserDetails 호환 처리를 위해 빌더 사용
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRole().name())
                .build();

        // 4. 기존 기기의 Token 무효화 및 새로운 Access & Refresh 토큰 생성
        refreshTokenService.delete(email, jti);

        String newAccessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(email);
        String newJti = jwtTokenProvider.getJti(newRefreshToken);

        // 5. Redis의 Refresh 토큰 갱신 (Rotation)
        refreshTokenService.save(email, newJti, newRefreshToken, jwtTokenProvider.getRefreshTokenExpirationMs());

        log.info("토큰 갱신 성공: {}", email);

        return new TokenDto(newAccessToken, newRefreshToken);
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));

        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getNickname(), user.getRole());
    }

    /**
     * 로그아웃
     */
    public void logout(String refreshToken, String accessToken) {
        if (refreshToken != null) {
            try {
                String email = jwtTokenProvider.getEmail(refreshToken);
                String jti = jwtTokenProvider.getJti(refreshToken);
                refreshTokenService.delete(email, jti);
                log.info("로그아웃 성공, 해당 기기의 리프레시 토큰 삭제: {}, jti: {}", email, jti);
            } catch (Exception e) {
                log.warn("Refresh Token 파싱 실패로 리프레시 토큰 삭제 로직 스킵: {}", e.getMessage());
            }
        }
        
        if (accessToken != null) {
            try {
                long remainingExpiration = jwtTokenProvider.getRemainingExpiration(accessToken);
                redisBlackListService.setBlackList(accessToken, remainingExpiration);
            } catch (Exception e) {
                log.warn("Access Token Blacklist 등록 스킵 (이미 만료됨 등): {}", e.getMessage());
            }
        }
    }

    private String resendCooldownMessage() {
        long cooldownMinutes = Math.max(1L, authEmailVerificationProperties.getResendCooldownMs() / 60000L);
        return "인증번호 재요청은 " + cooldownMinutes + "분 뒤에 가능합니다.";
    }
}
