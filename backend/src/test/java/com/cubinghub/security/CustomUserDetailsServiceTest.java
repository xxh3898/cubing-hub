package com.cubinghub.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
@DisplayName("CustomUserDetailsService 단위 테스트")
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    private CustomUserDetailsService customUserDetailsService;

    @BeforeEach
    void setUp() {
        customUserDetailsService = new CustomUserDetailsService(userRepository);
    }

    @Test
    @DisplayName("존재하는 사용자 이메일로 조회하면 UserDetails를 반환한다")
    void should_return_user_details_when_user_exists() {
        var user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername(user.getEmail());

        assertThat(userDetails.getUsername()).isEqualTo(user.getEmail());
        assertThat(userDetails.getPassword()).isEqualTo(user.getPassword());
        assertThat(userDetails.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_USER");
    }

    @Test
    @DisplayName("존재하지 않는 사용자 이메일로 조회하면 UsernameNotFoundException을 던진다")
    void should_throw_username_not_found_exception_when_user_does_not_exist() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> customUserDetailsService.loadUserByUsername("missing@cubinghub.com"));

        assertThat(thrown)
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessage("이메일에 해당하는 사용자를 찾을 수 없습니다: missing@cubinghub.com");
    }
}
