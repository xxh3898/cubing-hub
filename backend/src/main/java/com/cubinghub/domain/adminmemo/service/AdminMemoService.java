package com.cubinghub.domain.adminmemo.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.adminmemo.dto.request.AdminMemoCreateRequest;
import com.cubinghub.domain.adminmemo.dto.request.AdminMemoUpdateRequest;
import com.cubinghub.domain.adminmemo.dto.response.AdminMemoDetailResponse;
import com.cubinghub.domain.adminmemo.dto.response.AdminMemoListItemResponse;
import com.cubinghub.domain.adminmemo.dto.response.AdminMemoPageResponse;
import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import com.cubinghub.domain.adminmemo.repository.AdminMemoRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMemoService {

    private final AdminMemoRepository adminMemoRepository;

    public AdminMemoPageResponse getMemos(Integer page, Integer size) {
        validatePageRequest(page, size);

        Page<AdminMemo> memoPage = adminMemoRepository.findAllBy(
                PageRequest.of(page - 1, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")))
        );
        List<AdminMemoListItemResponse> items = memoPage.getContent().stream()
                .map(AdminMemoListItemResponse::from)
                .toList();

        return new AdminMemoPageResponse(
                items,
                page,
                size,
                memoPage.getTotalElements(),
                memoPage.getTotalPages(),
                memoPage.hasNext(),
                memoPage.hasPrevious()
        );
    }

    public AdminMemoDetailResponse getMemo(Long memoId) {
        return AdminMemoDetailResponse.from(findMemoById(memoId));
    }

    @Transactional
    public Long createMemo(AdminMemoCreateRequest request) {
        AdminMemo memo = adminMemoRepository.save(AdminMemo.builder()
                .question(request.getQuestion())
                .answer(request.getAnswer())
                .build());
        return memo.getId();
    }

    @Transactional
    public AdminMemoDetailResponse updateMemo(Long memoId, AdminMemoUpdateRequest request) {
        AdminMemo memo = findMemoById(memoId);
        memo.update(request.getQuestion(), request.getAnswer());
        return AdminMemoDetailResponse.from(memo);
    }

    @Transactional
    public void deleteMemo(Long memoId) {
        adminMemoRepository.delete(findMemoById(memoId));
    }

    private AdminMemo findMemoById(Long memoId) {
        return adminMemoRepository.findById(memoId)
                .orElseThrow(() -> new CustomApiException("관리자 메모를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validatePageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("잘못된 페이지 번호입니다.");
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        }
    }
}
