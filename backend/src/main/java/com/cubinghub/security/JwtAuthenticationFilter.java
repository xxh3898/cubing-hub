package com.cubinghub.security;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final RedisBlackListService redisBlackListService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        // 1. 헤더에서 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰 유효성 검증
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            
            // 2.1 Blacklist 검증 (로그아웃된 토큰인지 확안)
            if (redisBlackListService.isBlackListed(token)) {
                writeJsonError(response, HttpStatus.UNAUTHORIZED, "로그아웃 된 토큰입니다.");
                return;
            }

            // 3. 토큰에서 Email과 Role 정보 추출
            String email = jwtTokenProvider.getEmail(token);
            List<GrantedAuthority> authorities = jwtTokenProvider.getAuthorities(token);

            // 4. DB 조회 없이 토큰 정보만으로 UserDetails 구성 (Stateless 최적화)
            UserDetails userDetails = new User(email, "", authorities);

            // 5. Authentication 객체 생성 후 SecurityContext에 저장 (Principal 등록)
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.debug("인증 처리 완료 (Stateless) - 사용자: {}", email);
        }

        filterChain.doFilter(request, response);
    }

    // Authorization 헤더에서 Bearer 토큰 추출
    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private void writeJsonError(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(status, message)));
    }
}
