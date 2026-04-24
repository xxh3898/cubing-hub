package com.cubinghub.domain.adminmemo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import com.cubinghub.domain.adminmemo.repository.AdminMemoRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminMemoService 단위 테스트")
class AdminMemoServiceTest {

    @Mock
    private AdminMemoRepository adminMemoRepository;

    private AdminMemoService adminMemoService;

    @BeforeEach
    void setUp() {
        adminMemoService = new AdminMemoService(adminMemoRepository);
    }

    @Test
    @DisplayName("page가 1보다 작으면 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_page_is_less_than_one() {
        assertThatThrownBy(() -> adminMemoService.getMemos(0, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 페이지 번호입니다.");
    }

    @Test
    @DisplayName("size가 허용 범위를 벗어나면 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_size_is_out_of_range() {
        assertThatThrownBy(() -> adminMemoService.getMemos(1, 101))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("size가 1보다 작으면 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_size_is_less_than_one() {
        assertThatThrownBy(() -> adminMemoService.getMemos(1, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("존재하지 않는 관리자 메모 조회는 404 예외를 던진다")
    void should_throw_not_found_exception_when_memo_does_not_exist() {
        when(adminMemoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminMemoService.getMemo(99L))
                .isInstanceOf(CustomApiException.class)
                .satisfies(ex -> {
                    CustomApiException exception = (CustomApiException) ex;
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(exception.getMessage()).isEqualTo("관리자 메모를 찾을 수 없습니다.");
                });
    }

    @Test
    @DisplayName("존재하는 관리자 메모 조회는 상세 응답으로 변환한다")
    void should_return_memo_detail_when_memo_exists() {
        AdminMemo memo = AdminMemo.builder()
                .question("질문")
                .answer("답변")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(memo, "id", 10L);
        when(adminMemoRepository.findById(10L)).thenReturn(Optional.of(memo));

        assertThat(adminMemoService.getMemo(10L).getId()).isEqualTo(10L);
        assertThat(adminMemoService.getMemo(10L).getAnswerStatus().name()).isEqualTo("ANSWERED");
    }
}
