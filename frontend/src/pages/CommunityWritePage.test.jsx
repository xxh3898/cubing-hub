import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createPost, getEditablePost, updatePost } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import CommunityWritePage, { getFileExtension, revokePreviewUrls } from './CommunityWritePage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createPost: vi.fn(),
  getEditablePost: vi.fn(),
  updatePost: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderCommunityWritePage(path = '/community/write') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/community/write" element={<CommunityWritePage />} />
        <Route path="/community/:id/edit" element={<CommunityWritePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CommunityWritePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should_submit_post_and_redirect_to_detail_when_admin_creates_notice_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Admin',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(createPost).mockResolvedValue({
      data: {
        id: 33,
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('카테고리'), { target: { value: 'NOTICE' } })
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '공지 제목' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '공지 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(createPost).toHaveBeenCalledWith({
        category: 'NOTICE',
        title: '공지 제목',
        content: '공지 본문',
        retainedAttachmentIds: [],
        images: [],
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/community/33', { replace: true })
  })

  it('should_parse_file_extensions_case_insensitively_and_handle_missing_extensions', () => {
    expect(getFileExtension('cube.JPG')).toBe('jpg')
    expect(getFileExtension('cube')).toBe('')
    expect(getFileExtension('cube.')).toBe('')
  })

  it('should_revoke_preview_urls_for_each_preview_item', () => {
    revokePreviewUrls([
      { previewUrl: 'blob:first' },
      { previewUrl: 'blob:second' },
    ])

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second')
  })

  it('should_hide_notice_option_when_current_user_is_not_admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    expect(screen.queryByRole('option', { name: '공지사항' })).not.toBeInTheDocument()
  })

  it('should_preload_post_and_submit_update_when_author_edits_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({
      data: {
        id: 33,
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'Tester',
        attachments: [],
      },
    })
    vi.mocked(updatePost).mockResolvedValue({
      data: null,
    })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('기존 제목')).toBeInTheDocument()
    expect(screen.getByDisplayValue('기존 본문')).toBeInTheDocument()
    expect(getEditablePost).toHaveBeenCalledWith(33)

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수정 제목' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '수정 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(33, {
        category: 'FREE',
        title: '수정 제목',
        content: '수정 본문',
        retainedAttachmentIds: [],
        images: [],
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/community/33', { replace: true })
  })

  it('should_keep_existing_attachment_ids_when_edit_submit_retains_images', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Admin',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({
      data: {
        id: 33,
        category: 'NOTICE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'Admin',
        attachments: [
          {
            id: 7,
            imageUrl: 'https://cdn.example.com/cube.jpg',
            originalFileName: 'cube.jpg',
          },
        ],
      },
    })
    vi.mocked(updatePost).mockResolvedValue({ data: null })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('기존 제목')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(33, {
        category: 'NOTICE',
        title: '기존 제목',
        content: '기존 본문',
        retainedAttachmentIds: [7],
        images: [],
      })
    })
  })

  it('should_treat_missing_attachment_lists_as_empty_when_edit_post_is_loaded', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({
      data: {
        id: 33,
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'Tester',
      },
    })
    vi.mocked(updatePost).mockResolvedValue({ data: null })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('기존 제목')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(33, {
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        retainedAttachmentIds: [],
        images: [],
      })
    })
  })

  it('should_show_permission_error_when_current_user_cannot_edit_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockRejectedValue(new Error('게시글 수정/삭제 권한이 없습니다.'))

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByText('게시글 수정/삭제 권한이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument()
    expect(updatePost).not.toHaveBeenCalled()
  })

  it('should_show_not_found_error_when_edit_post_id_is_invalid', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage('/community/not-a-number/edit')

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getEditablePost).not.toHaveBeenCalled()
  })

  it('should_navigate_to_list_when_error_page_list_button_is_clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage('/community/not-a-number/edit')

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }))

    expect(mockNavigate).toHaveBeenCalledWith('/community')
  })

  it('should_show_validation_error_when_title_or_content_is_blank', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByText('제목과 내용을 모두 입력해주세요.')).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('should_apply_input_length_limits_to_post_form_fields', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    expect(screen.getByLabelText('제목')).toHaveAttribute('maxLength', '100')
    expect(screen.getByLabelText('내용')).toHaveAttribute('maxLength', '2000')
  })

  it('should_include_selected_images_when_creating_post', async () => {
    const imageFile = new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' })

    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(createPost).mockResolvedValue({
      data: {
        id: 55,
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '이미지 글' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '이미지 본문' } })
    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [imageFile] } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(createPost).toHaveBeenCalledWith({
        category: 'FREE',
        title: '이미지 글',
        content: '이미지 본문',
        retainedAttachmentIds: [],
        images: [imageFile],
      })
    })
  })

  it('should_redirect_to_list_when_created_post_response_does_not_include_id', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(createPost).mockResolvedValue({
      data: {},
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 글' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '본문' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(createPost).toHaveBeenCalled()
    })
    expect(mockNavigate).toHaveBeenCalledWith('/community', { replace: true })
  })

  it('should_reset_notice_category_to_free_when_non_admin_edits_notice_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({
      data: {
        id: 33,
        category: 'NOTICE',
        title: '공지 제목',
        content: '공지 본문',
        authorNickname: 'Tester',
        attachments: [],
      },
    })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('공지 제목')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('카테고리')).toHaveValue('FREE')
    })
  })

  it('should_show_not_found_error_when_editable_post_response_is_null', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({ data: null })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
  })

  it('should_show_validation_error_when_image_count_exceeds_limit', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    const files = Array.from({ length: 6 }, (_, index) => new File(['image'], `cube-${index}.jpg`, { type: 'image/jpeg' }))

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files } })

    expect(await screen.findByText('게시글 이미지는 최대 5장까지 첨부할 수 있습니다.')).toBeInTheDocument()
  })

  it('should_show_validation_error_when_image_total_size_exceeds_limit', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    const largeFileA = new File(['a'], 'large-a.jpg', { type: 'image/jpeg' })
    const largeFileB = new File(['b'], 'large-b.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFileA, 'size', { value: 20 * 1024 * 1024 })
    Object.defineProperty(largeFileB, 'size', { value: 20 * 1024 * 1024 })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [largeFileA, largeFileB] } })

    expect(await screen.findByText('새로 추가하는 이미지 전체 용량은 30MB 이하여야 합니다.')).toBeInTheDocument()
  })

  it('should_show_validation_error_when_added_images_push_total_size_over_limit', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    const firstBatch = [
      new File(['a'], 'first-a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'first-b.jpg', { type: 'image/jpeg' }),
    ]
    const secondBatch = [
      new File(['c'], 'second-a.jpg', { type: 'image/jpeg' }),
      new File(['d'], 'second-b.jpg', { type: 'image/jpeg' }),
    ]
    firstBatch.forEach((file) => {
      Object.defineProperty(file, 'size', { value: 9 * 1024 * 1024 })
    })
    secondBatch.forEach((file) => {
      Object.defineProperty(file, 'size', { value: 9 * 1024 * 1024 })
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: firstBatch } })
    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: secondBatch } })

    expect(await screen.findByText('새로 추가하는 이미지 전체 용량은 30MB 이하여야 합니다.')).toBeInTheDocument()
  })

  it('should_show_validation_error_when_image_extension_or_file_size_is_invalid', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    const invalidExtensionFile = new File(['image'], 'cube.gif', { type: 'image/gif' })
    const tooLargeFile = new File(['image'], 'cube.jpg', { type: 'image/jpeg' })
    Object.defineProperty(tooLargeFile, 'size', { value: 11 * 1024 * 1024 })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [invalidExtensionFile] } })
    expect(await screen.findByText('게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [tooLargeFile] } })
    expect(await screen.findByText('이미지 파일은 10MB 이하여야 합니다.')).toBeInTheDocument()
  })

  it('should_remove_existing_attachment_and_new_image_before_submit', async () => {
    const imageFile = new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' })

    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Admin',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(getEditablePost).mockResolvedValue({
      data: {
        id: 33,
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'Admin',
        attachments: [
          {
            id: 7,
            imageUrl: 'https://cdn.example.com/cube.jpg',
            originalFileName: 'cube.jpg',
          },
        ],
      },
    })
    vi.mocked(updatePost).mockResolvedValue({ data: null })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('기존 제목')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [imageFile] } })
    fireEvent.click(screen.getByRole('button', { name: '제외' }))
    fireEvent.click(screen.getByRole('button', { name: '제거' }))
    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(33, {
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        retainedAttachmentIds: [],
        images: [],
      })
    })

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('should_show_error_message_when_create_post_request_fails_and_navigate_on_cancel', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(createPost).mockRejectedValue(new Error('게시글 저장 실패'))

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 글' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '본문' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByText('게시글 저장 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(mockNavigate).toHaveBeenCalledWith('/community')
  })

  it('should_revoke_preview_urls_when_component_is_unmounted_with_new_images', () => {
    const imageFile = new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' })

    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    const { unmount } = renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [imageFile] } })

    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('should_ignore_empty_image_selection', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: { files: [] } })

    expect(screen.queryByRole('button', { name: '제거' })).not.toBeInTheDocument()
    expect(screen.queryByText('게시글 이미지는 최대 5장까지 첨부할 수 있습니다.')).not.toBeInTheDocument()
  })

  it('should_ignore_missing_file_lists_without_showing_image_errors', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('이미지 첨부'), { target: {} })

    expect(screen.queryByText('이미지 파일은 10MB 이하여야 합니다.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '제거' })).not.toBeInTheDocument()
  })

  it('should_ignore_pending_editable_post_success_when_component_is_unmounted', async () => {
    let resolvePost
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )

    const { unmount } = renderCommunityWritePage('/community/33/edit')

    unmount()
    resolvePost({
      data: {
        id: 33,
        category: 'FREE',
        title: '늦은 게시글',
        content: '늦은 본문',
        authorNickname: 'Tester',
      },
    })

    await waitFor(() => {
      expect(getEditablePost).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_editable_post_failure_when_component_is_unmounted', async () => {
    let rejectPost
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getEditablePost).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectPost = reject
        }),
    )

    const { unmount } = renderCommunityWritePage('/community/33/edit')

    unmount()
    rejectPost(new Error('late editable post failure'))

    await waitFor(() => {
      expect(getEditablePost).toHaveBeenCalledTimes(1)
    })
  })
})
