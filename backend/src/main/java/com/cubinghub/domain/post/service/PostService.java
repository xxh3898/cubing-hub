package com.cubinghub.domain.post.service;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.response.PostAttachmentResponse;
import com.cubinghub.domain.post.dto.response.PostDetailResponse;
import com.cubinghub.domain.post.dto.response.PostPageResponse;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.PostAttachment;
import com.cubinghub.domain.post.entity.PostView;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.CommentRepository;
import com.cubinghub.domain.post.repository.PostAttachmentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.post.repository.PostSearchResult;
import com.cubinghub.domain.post.repository.PostViewRepository;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.StoredPostImage;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostAttachmentRepository postAttachmentRepository;
    private final PostViewRepository postViewRepository;
    private final UserRepository userRepository;
    private final PostImageStorageService postImageStorageService;
    private final PostImageStorageProperties postImageStorageProperties;

    @Transactional
    public Long createPost(String email, PostCreateRequest request) {
        return createPost(email, request, null);
    }

    @Transactional
    public Long createPost(String email, PostCreateRequest request, List<MultipartFile> images) {
        User user = findUserByEmail(email);
        validateNoticeWritePermission(request.getCategory(), user);
        List<MultipartFile> normalizedImages = normalizeImages(images);
        validateAttachmentRequest(normalizedImages, 0, 0L);

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        Post savedPost = postRepository.save(post);
        List<StoredPostImage> uploadedImages = uploadImages(normalizedImages);
        registerRollbackCleanup(uploadedImages);
        saveNewAttachments(savedPost, uploadedImages, 0);

        return savedPost.getId();
    }

    public PostPageResponse getPosts(PostCategory category, String keyword, String author, Integer page, Integer size) {
        validatePageRequest(page, size);
        validateSearchRequest(keyword, author);

        PostSearchResult result = postRepository.search(category, keyword, author, (page - 1) * size, size);
        long totalElements = result.getTotalElements();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);

        return new PostPageResponse(
                result.getItems(),
                page,
                size,
                totalElements,
                totalPages,
                page < totalPages,
                page > 1
        );
    }

    @Transactional
    public PostDetailResponse getPost(Long postId) {
        return getPost(postId, null);
    }

    @Transactional
    public PostDetailResponse getPost(Long postId, String email) {
        Post post = findPostWithUserById(postId);
        registerViewIfNeeded(post, email);
        return buildPostDetailResponse(postId, post);
    }

    public PostDetailResponse getEditablePost(Long postId, String email) {
        User currentUser = findUserByEmail(email);
        Post post = findPostWithUserById(postId);
        validateOwnershipOrAdmin(post, currentUser);
        return buildPostDetailResponse(postId, post);
    }

    private PostDetailResponse buildPostDetailResponse(Long postId, Post post) {
        List<PostAttachmentResponse> attachments = postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(postId)
                .stream()
                .map(PostAttachmentResponse::from)
                .toList();

        return PostDetailResponse.from(post, attachments);
    }

    @Transactional
    public void updatePost(Long postId, String email, PostUpdateRequest request) {
        updatePost(postId, email, request, null);
    }

    @Transactional
    public void updatePost(Long postId, String email, PostUpdateRequest request, List<MultipartFile> images) {
        User currentUser = findUserByEmail(email);
        Post post = findPostById(postId);
        List<PostAttachment> currentAttachments = postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(postId);

        validateOwnershipOrAdmin(post, currentUser);
        validateNoticeWritePermission(request.getCategory(), currentUser);
        List<PostAttachment> retainedAttachments = resolveRetainedAttachments(currentAttachments, request.getRetainedAttachmentIds());
        long retainedTotalSize = retainedAttachments.stream()
                .mapToLong(PostAttachment::getFileSizeBytes)
                .sum();
        List<MultipartFile> normalizedImages = normalizeImages(images);
        validateAttachmentRequest(normalizedImages, retainedAttachments.size(), retainedTotalSize);

        post.update(request.getCategory(), request.getTitle(), request.getContent());
        List<PostAttachment> removedAttachments = currentAttachments.stream()
                .filter(attachment -> !retainedAttachments.contains(attachment))
                .toList();
        List<StoredPostImage> uploadedImages = uploadImages(normalizedImages);
        registerRollbackCleanup(uploadedImages);

        for (int index = 0; index < retainedAttachments.size(); index++) {
            retainedAttachments.get(index).updateDisplayOrder(index);
        }

        if (!removedAttachments.isEmpty()) {
            postAttachmentRepository.deleteAll(removedAttachments);
            registerAfterCommitDeletion(removedAttachments.stream().map(PostAttachment::getObjectKey).toList());
        }

        saveNewAttachments(post, uploadedImages, retainedAttachments.size());
    }

    @Transactional
    public void deletePost(Long postId, String email) {
        User currentUser = findUserByEmail(email);
        Post post = findPostById(postId);
        List<PostAttachment> attachments = postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(postId);

        validateOwnershipOrAdmin(post, currentUser);
        commentRepository.deleteAllByPostId(postId);
        postViewRepository.deleteAllByPostId(postId);
        if (!attachments.isEmpty()) {
            postAttachmentRepository.deleteAll(attachments);
            registerAfterCommitDeletion(attachments.stream().map(PostAttachment::getObjectKey).toList());
        }
        postRepository.delete(post);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private Post findPostById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private Post findPostWithUserById(Long postId) {
        return postRepository.findWithUserById(postId)
                .orElseThrow(() -> new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void registerViewIfNeeded(Post post, String email) {
        User currentUser = findOptionalUserByEmail(email);
        if (currentUser == null) {
            return;
        }

        try {
            if (postViewRepository.existsByPostIdAndUserId(post.getId(), currentUser.getId())) {
                return;
            }

            postViewRepository.save(PostView.builder()
                    .post(post)
                    .user(currentUser)
                    .build());
            post.increaseViewCount();
        } catch (DataIntegrityViolationException ignored) {
            // 같은 사용자의 동시 요청 경합에서는 unique 제약이 최종 방어선이다.
        } catch (RuntimeException ex) {
            log.error("게시글 조회수 기록 실패 - postId: {}, userId: {}", post.getId(), currentUser.getId(), ex);
        }
    }

    private void validateOwnershipOrAdmin(Post post, User currentUser) {
        if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
            return;
        }

        if (!post.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException("게시글 수정/삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    private void validateNoticeWritePermission(PostCategory category, User currentUser) {
        if (category != PostCategory.NOTICE) {
            return;
        }

        if (currentUser.getRole() != UserRole.ROLE_ADMIN) {
            throw new CustomApiException("공지사항 작성/수정 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    private void validatePageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("잘못된 페이지 번호입니다.");
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        }
    }

    private void validateSearchRequest(String keyword, String author) {
        if (StringUtils.hasText(keyword) && keyword.trim().length() > InputConstraints.POST_SEARCH_KEYWORD_MAX_LENGTH) {
            throw new IllegalArgumentException("게시글 검색어는 100자 이하여야 합니다.");
        }

        if (StringUtils.hasText(author) && author.trim().length() > InputConstraints.POST_SEARCH_AUTHOR_MAX_LENGTH) {
            throw new IllegalArgumentException("작성자 검색어는 50자 이하여야 합니다.");
        }
    }

    private User findOptionalUserByEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }

        return userRepository.findByEmail(email).orElse(null);
    }

    private List<MultipartFile> normalizeImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return Collections.emptyList();
        }

        return images.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
    }

    private void validateAttachmentRequest(List<MultipartFile> images, int retainedCount, long retainedTotalSize) {
        if (retainedCount + images.size() > postImageStorageProperties.getMaxFileCount()) {
            throw new IllegalArgumentException("게시글 이미지는 최대 %d장까지 첨부할 수 있습니다."
                    .formatted(postImageStorageProperties.getMaxFileCount()));
        }

        long newFilesTotalSize = 0L;
        for (MultipartFile image : images) {
            validateImageExtension(image);

            if (image.getSize() > postImageStorageProperties.getMaxFileSizeBytes()) {
                throw new IllegalArgumentException("이미지 파일은 10MB 이하여야 합니다.");
            }

            newFilesTotalSize += image.getSize();
        }

        if (retainedTotalSize + newFilesTotalSize > postImageStorageProperties.getMaxTotalSizeBytes()) {
            throw new IllegalArgumentException("게시글 이미지 전체 용량은 30MB 이하여야 합니다.");
        }
    }

    private void validateImageExtension(MultipartFile image) {
        String originalFilename = image.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        Set<String> allowedExtensions = Set.of("jpg", "jpeg", "png", "webp");
        if (!allowedExtensions.contains(extension)) {
            throw new IllegalArgumentException("게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.");
        }
    }

    private List<StoredPostImage> uploadImages(List<MultipartFile> images) {
        if (images.isEmpty()) {
            return Collections.emptyList();
        }

        List<StoredPostImage> uploadedImages = new ArrayList<>(images.size());
        for (MultipartFile image : images) {
            uploadedImages.add(postImageStorageService.upload(image));
        }
        return uploadedImages;
    }

    private void saveNewAttachments(Post post, List<StoredPostImage> uploadedImages, int startOrder) {
        if (uploadedImages.isEmpty()) {
            return;
        }

        List<PostAttachment> newAttachments = new ArrayList<>(uploadedImages.size());
        for (int index = 0; index < uploadedImages.size(); index++) {
            StoredPostImage uploadedImage = uploadedImages.get(index);
            newAttachments.add(PostAttachment.builder()
                    .post(post)
                    .objectKey(uploadedImage.objectKey())
                    .imageUrl(uploadedImage.imageUrl())
                    .originalFileName(uploadedImage.originalFileName())
                    .contentType(uploadedImage.contentType())
                    .fileSizeBytes(uploadedImage.fileSizeBytes())
                    .displayOrder(startOrder + index)
                    .build());
        }
        postAttachmentRepository.saveAll(newAttachments);
    }

    private List<PostAttachment> resolveRetainedAttachments(List<PostAttachment> currentAttachments, List<Long> retainedAttachmentIds) {
        if (retainedAttachmentIds == null || retainedAttachmentIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, PostAttachment> attachmentMap = currentAttachments.stream()
                .collect(java.util.stream.Collectors.toMap(PostAttachment::getId, attachment -> attachment));
        Set<Long> uniqueIds = new HashSet<>(retainedAttachmentIds);

        if (uniqueIds.size() != retainedAttachmentIds.size()) {
            throw new IllegalArgumentException("기존 첨부 이미지 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
        }

        List<PostAttachment> retainedAttachments = new ArrayList<>(retainedAttachmentIds.size());
        for (Long retainedAttachmentId : retainedAttachmentIds) {
            PostAttachment attachment = attachmentMap.get(retainedAttachmentId);
            if (attachment == null) {
                throw new IllegalArgumentException("기존 첨부 이미지 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
            }
            retainedAttachments.add(attachment);
        }

        return retainedAttachments;
    }

    private void registerRollbackCleanup(List<StoredPostImage> uploadedImages) {
        if (uploadedImages.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    return;
                }

                for (StoredPostImage uploadedImage : uploadedImages) {
                    try {
                        postImageStorageService.delete(uploadedImage.objectKey());
                    } catch (Exception ignored) {
                        // rollback cleanup은 best effort로 처리한다.
                    }
                }
            }
        });
    }

    private void registerAfterCommitDeletion(List<String> objectKeys) {
        if (objectKeys.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (String objectKey : objectKeys) {
                    try {
                        postImageStorageService.delete(objectKey);
                    } catch (Exception ignored) {
                        // 원격 object 삭제는 best effort로 처리한다.
                    }
                }
            }
        });
    }
}
