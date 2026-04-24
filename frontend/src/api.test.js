import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiClientMock, refreshAccessTokenMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  refreshAccessTokenMock: vi.fn(),
}))

vi.mock('./lib/apiClient.js', () => ({
  default: apiClientMock,
  refreshAccessToken: refreshAccessTokenMock,
}))

import {
  changeMyPassword,
  clearRefreshCookie,
  confirmEmailVerification,
  confirmPasswordReset,
  createAdminMemo,
  createComment,
  createFeedback,
  createPost,
  deleteAdminMemo,
  deleteComment,
  deletePost,
  deleteRecord,
  getAdminFeedback,
  getAdminFeedbacks,
  getAdminMemo,
  getAdminMemos,
  getComments,
  getEditablePost,
  getHome,
  getMe,
  getMyProfile,
  getMyRecords,
  getPost,
  getPosts,
  getQna,
  getQnaDetail,
  getRankings,
  getScramble,
  login,
  logout,
  refreshSession,
  requestEmailVerification,
  requestPasswordReset,
  saveRecord,
  signUp,
  updateAdminFeedbackAnswer,
  updateAdminFeedbackVisibility,
  updateAdminMemo,
  updateMyProfile,
  updatePost,
  updateRecordPenalty,
} from './api.js'

function createAxiosResponse(data) {
  return { data }
}

function createResponseError(message, status = 400) {
  return {
    response: {
      status,
      data: {
        message,
      },
    },
  }
}

function createMessageOnlyError(message) {
  return new Error(message)
}

function createUnknownError() {
  return {}
}

function expectRequestError(error, message, status, isNetworkError) {
  expect(error).toBeInstanceOf(Error)
  expect(error.message).toBe(message)
  expect(error.status).toBe(status)
  expect(error.isNetworkError).toBe(isNetworkError)
}

const genericCases = [
  {
    name: 'signUp',
    fn: signUp,
    method: 'post',
    args: [{ email: 'cube@example.com', password: 'Password123!' }],
    expectedCallArgs: ['/api/auth/signup', { email: 'cube@example.com', password: 'Password123!' }, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('회원가입 실패'),
    expectedErrorMessage: '회원가입 실패',
  },
  {
    name: 'requestEmailVerification',
    fn: requestEmailVerification,
    method: 'post',
    args: [{ email: 'cube@example.com' }],
    expectedCallArgs: ['/api/auth/email-verification/request', { email: 'cube@example.com' }, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('인증 메일 발송 실패'),
    expectedErrorMessage: '인증 메일 발송 실패',
  },
  {
    name: 'requestPasswordReset',
    fn: requestPasswordReset,
    method: 'post',
    args: [{ email: 'cube@example.com' }],
    expectedCallArgs: ['/api/auth/password-reset/request', { email: 'cube@example.com' }, { _skipAuthRefresh: true }],
    errorFactory: () => createMessageOnlyError('비밀번호 재설정 메일 발송 실패'),
    expectedErrorMessage: '비밀번호 재설정 메일 발송 실패',
  },
  {
    name: 'confirmEmailVerification',
    fn: confirmEmailVerification,
    method: 'post',
    args: [{ email: 'cube@example.com', code: '123456' }],
    expectedCallArgs: ['/api/auth/email-verification/confirm', { email: 'cube@example.com', code: '123456' }, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('이메일 인증 확인 실패'),
    expectedErrorMessage: '이메일 인증 확인 실패',
  },
  {
    name: 'confirmPasswordReset',
    fn: confirmPasswordReset,
    method: 'post',
    args: [{ email: 'cube@example.com', code: '123456', newPassword: 'Password123!' }],
    expectedCallArgs: ['/api/auth/password-reset/confirm', { email: 'cube@example.com', code: '123456', newPassword: 'Password123!' }, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('비밀번호 재설정 확인 실패'),
    expectedErrorMessage: '비밀번호 재설정 확인 실패',
  },
  {
    name: 'logout',
    fn: logout,
    method: 'post',
    args: [],
    expectedCallArgs: ['/api/auth/logout', null, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('로그아웃 실패'),
    expectedErrorMessage: '로그아웃 실패',
  },
  {
    name: 'getMe',
    fn: getMe,
    method: 'get',
    args: [],
    expectedCallArgs: ['/api/me'],
    errorFactory: () => createResponseError('내 정보 조회 실패'),
    expectedErrorMessage: '내 정보 조회 실패',
  },
  {
    name: 'getMyProfile',
    fn: getMyProfile,
    method: 'get',
    args: [],
    expectedCallArgs: ['/api/users/me/profile'],
    errorFactory: () => createResponseError('프로필 조회 실패'),
    expectedErrorMessage: '프로필 조회 실패',
  },
  {
    name: 'updateMyProfile',
    fn: updateMyProfile,
    method: 'patch',
    args: [{ nickname: 'SpeedMaster' }],
    expectedCallArgs: ['/api/users/me/profile', { nickname: 'SpeedMaster' }],
    errorFactory: () => createResponseError('프로필 수정 실패'),
    expectedErrorMessage: '프로필 수정 실패',
  },
  {
    name: 'getMyRecords',
    fn: getMyRecords,
    method: 'get',
    args: [{ page: 2, size: 10 }],
    expectedCallArgs: ['/api/users/me/records', { params: { page: 2, size: 10 } }],
    errorFactory: () => createResponseError('내 기록 조회 실패'),
    expectedErrorMessage: '내 기록 조회 실패',
  },
  {
    name: 'changeMyPassword',
    fn: changeMyPassword,
    method: 'patch',
    args: [{ currentPassword: 'Password123!', newPassword: 'NewPassword123!' }],
    expectedCallArgs: ['/api/users/me/password', { currentPassword: 'Password123!', newPassword: 'NewPassword123!' }],
    errorFactory: () => createResponseError('비밀번호 변경 실패'),
    expectedErrorMessage: '비밀번호 변경 실패',
  },
  {
    name: 'getHome',
    fn: getHome,
    method: 'get',
    args: [],
    expectedCallArgs: ['/api/home'],
    errorFactory: () => createUnknownError(),
    expectedErrorMessage: '요청 처리 중 오류가 발생했습니다.',
  },
  {
    name: 'getRankings',
    fn: getRankings,
    method: 'get',
    args: [{ eventType: 'WCA_333' }],
    expectedCallArgs: ['/api/rankings', { params: { eventType: 'WCA_333' } }],
    errorFactory: () => createResponseError('랭킹 조회 실패'),
    expectedErrorMessage: '랭킹 조회 실패',
  },
  {
    name: 'getPosts',
    fn: getPosts,
    method: 'get',
    args: [{ page: 1, size: 8 }],
    expectedCallArgs: ['/api/posts', { params: { page: 1, size: 8 } }],
    errorFactory: () => createResponseError('게시글 목록 조회 실패'),
    expectedErrorMessage: '게시글 목록 조회 실패',
  },
  {
    name: 'getPost',
    fn: getPost,
    method: 'get',
    args: [7],
    expectedCallArgs: ['/api/posts/7'],
    errorFactory: () => createResponseError('게시글 조회 실패'),
    expectedErrorMessage: '게시글 조회 실패',
  },
  {
    name: 'getEditablePost',
    fn: getEditablePost,
    method: 'get',
    args: [7],
    expectedCallArgs: ['/api/posts/7/edit'],
    errorFactory: () => createResponseError('게시글 수정용 조회 실패'),
    expectedErrorMessage: '게시글 수정용 조회 실패',
  },
  {
    name: 'deletePost',
    fn: deletePost,
    method: 'delete',
    args: [7],
    expectedCallArgs: ['/api/posts/7'],
    errorFactory: () => createResponseError('게시글 삭제 실패'),
    expectedErrorMessage: '게시글 삭제 실패',
  },
  {
    name: 'getQna',
    fn: getQna,
    method: 'get',
    args: [{ page: 1, size: 8 }],
    expectedCallArgs: ['/api/qna', { params: { page: 1, size: 8 } }],
    errorFactory: () => createResponseError('공개 질문 목록 조회 실패'),
    expectedErrorMessage: '공개 질문 목록 조회 실패',
  },
  {
    name: 'getQnaDetail',
    fn: getQnaDetail,
    method: 'get',
    args: [11],
    expectedCallArgs: ['/api/qna/11'],
    errorFactory: () => createResponseError('공개 질문 상세 조회 실패'),
    expectedErrorMessage: '공개 질문 상세 조회 실패',
  },
  {
    name: 'getComments',
    fn: getComments,
    method: 'get',
    args: [7, { page: 3, size: 20 }],
    expectedCallArgs: ['/api/posts/7/comments', { params: { page: 3, size: 20 } }],
    errorFactory: () => createResponseError('댓글 목록 조회 실패'),
    expectedErrorMessage: '댓글 목록 조회 실패',
  },
  {
    name: 'createComment',
    fn: createComment,
    method: 'post',
    args: [7, { content: '좋은 글입니다.' }],
    expectedCallArgs: ['/api/posts/7/comments', { content: '좋은 글입니다.' }],
    errorFactory: () => createResponseError('댓글 작성 실패'),
    expectedErrorMessage: '댓글 작성 실패',
  },
  {
    name: 'deleteComment',
    fn: deleteComment,
    method: 'delete',
    args: [7, 3],
    expectedCallArgs: ['/api/posts/7/comments/3'],
    errorFactory: () => createResponseError('댓글 삭제 실패'),
    expectedErrorMessage: '댓글 삭제 실패',
  },
  {
    name: 'getScramble',
    fn: getScramble,
    method: 'get',
    args: ['WCA_333'],
    expectedCallArgs: ['/api/scramble', { params: { eventType: 'WCA_333' } }],
    errorFactory: () => createResponseError('스크램블 조회 실패'),
    expectedErrorMessage: '스크램블 조회 실패',
  },
  {
    name: 'saveRecord',
    fn: saveRecord,
    method: 'post',
    args: [{ eventType: 'WCA_333', timeMs: 8123 }],
    expectedCallArgs: ['/api/records', { eventType: 'WCA_333', timeMs: 8123 }],
    errorFactory: () => createResponseError('기록 저장 실패'),
    expectedErrorMessage: '기록 저장 실패',
  },
  {
    name: 'updateRecordPenalty',
    fn: updateRecordPenalty,
    method: 'patch',
    args: [19, { penalty: 'PLUS_TWO' }],
    expectedCallArgs: ['/api/records/19', { penalty: 'PLUS_TWO' }],
    errorFactory: () => createResponseError('페널티 수정 실패'),
    expectedErrorMessage: '페널티 수정 실패',
  },
  {
    name: 'deleteRecord',
    fn: deleteRecord,
    method: 'delete',
    args: [19],
    expectedCallArgs: ['/api/records/19'],
    errorFactory: () => createResponseError('기록 삭제 실패'),
    expectedErrorMessage: '기록 삭제 실패',
  },
]

const requestErrorCases = [
  {
    name: 'login',
    fn: login,
    method: 'post',
    args: [{ email: 'cube@example.com', password: 'Password123!' }],
    expectedCallArgs: ['/api/auth/login', { email: 'cube@example.com', password: 'Password123!' }, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('로그인 실패', 401),
    expectedErrorMessage: '로그인 실패',
    expectedStatus: 401,
    expectedIsNetworkError: false,
  },
  {
    name: 'clearRefreshCookie',
    fn: clearRefreshCookie,
    method: 'post',
    args: [],
    expectedCallArgs: ['/api/session/clear-refresh-cookie', null, { _skipAuthRefresh: true }],
    errorFactory: () => createResponseError('쿠키 정리 실패', 500),
    expectedErrorMessage: '쿠키 정리 실패',
    expectedStatus: 500,
    expectedIsNetworkError: false,
  },
  {
    name: 'createFeedback',
    fn: createFeedback,
    method: 'post',
    args: [{ category: 'BUG', title: '로그인 문제' }],
    expectedCallArgs: ['/api/feedbacks', { category: 'BUG', title: '로그인 문제' }],
    errorFactory: () => createResponseError('피드백 등록 실패', 400),
    expectedErrorMessage: '피드백 등록 실패',
    expectedStatus: 400,
    expectedIsNetworkError: false,
  },
  {
    name: 'getAdminFeedbacks',
    fn: getAdminFeedbacks,
    method: 'get',
    args: [{ page: 1, size: 10 }],
    expectedCallArgs: ['/api/admin/feedbacks', { params: { page: 1, size: 10 } }],
    errorFactory: () => createResponseError('피드백 목록 조회 실패', 500),
    expectedErrorMessage: '피드백 목록 조회 실패',
    expectedStatus: 500,
    expectedIsNetworkError: false,
  },
  {
    name: 'getAdminFeedback',
    fn: getAdminFeedback,
    method: 'get',
    args: [3],
    expectedCallArgs: ['/api/admin/feedbacks/3'],
    errorFactory: () => createResponseError('피드백 상세 조회 실패', 404),
    expectedErrorMessage: '피드백 상세 조회 실패',
    expectedStatus: 404,
    expectedIsNetworkError: false,
  },
  {
    name: 'updateAdminFeedbackAnswer',
    fn: updateAdminFeedbackAnswer,
    method: 'patch',
    args: [3, { answer: '확인 중입니다.' }],
    expectedCallArgs: ['/api/admin/feedbacks/3/answer', { answer: '확인 중입니다.' }],
    errorFactory: () => createResponseError('답변 저장 실패', 400),
    expectedErrorMessage: '답변 저장 실패',
    expectedStatus: 400,
    expectedIsNetworkError: false,
  },
  {
    name: 'updateAdminFeedbackVisibility',
    fn: updateAdminFeedbackVisibility,
    method: 'patch',
    args: [3, { visible: true }],
    expectedCallArgs: ['/api/admin/feedbacks/3/visibility', { visible: true }],
    errorFactory: () => createResponseError('공개 설정 저장 실패', 400),
    expectedErrorMessage: '공개 설정 저장 실패',
    expectedStatus: 400,
    expectedIsNetworkError: false,
  },
  {
    name: 'getAdminMemos',
    fn: getAdminMemos,
    method: 'get',
    args: [{ page: 2, size: 10 }],
    expectedCallArgs: ['/api/admin/memos', { params: { page: 2, size: 10 } }],
    errorFactory: () => createResponseError('메모 목록 조회 실패', 500),
    expectedErrorMessage: '메모 목록 조회 실패',
    expectedStatus: 500,
    expectedIsNetworkError: false,
  },
  {
    name: 'getAdminMemo',
    fn: getAdminMemo,
    method: 'get',
    args: [4],
    expectedCallArgs: ['/api/admin/memos/4'],
    errorFactory: () => createResponseError('메모 상세 조회 실패', 404),
    expectedErrorMessage: '메모 상세 조회 실패',
    expectedStatus: 404,
    expectedIsNetworkError: false,
  },
  {
    name: 'createAdminMemo',
    fn: createAdminMemo,
    method: 'post',
    args: [{ question: '운영 메모', answer: '초안' }],
    expectedCallArgs: ['/api/admin/memos', { question: '운영 메모', answer: '초안' }],
    errorFactory: () => createResponseError('메모 생성 실패', 400),
    expectedErrorMessage: '메모 생성 실패',
    expectedStatus: 400,
    expectedIsNetworkError: false,
  },
  {
    name: 'updateAdminMemo',
    fn: updateAdminMemo,
    method: 'patch',
    args: [4, { question: '수정된 메모', answer: '수정됨' }],
    expectedCallArgs: ['/api/admin/memos/4', { question: '수정된 메모', answer: '수정됨' }],
    errorFactory: () => createResponseError('메모 수정 실패', 400),
    expectedErrorMessage: '메모 수정 실패',
    expectedStatus: 400,
    expectedIsNetworkError: false,
  },
  {
    name: 'deleteAdminMemo',
    fn: deleteAdminMemo,
    method: 'delete',
    args: [4],
    expectedCallArgs: ['/api/admin/memos/4'],
    errorFactory: () => createResponseError('메모 삭제 실패', 500),
    expectedErrorMessage: '메모 삭제 실패',
    expectedStatus: 500,
    expectedIsNetworkError: false,
  },
]

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(genericCases)('should_wrap_response_and_throw_generic_error_when_%s_request_is_processed', async ({
    fn,
    method,
    args,
    expectedCallArgs,
    errorFactory,
    expectedErrorMessage,
  }) => {
    const mockMethod = apiClientMock[method]
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { source: method },
    }

    mockMethod.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(fn(...args)).resolves.toEqual(responseData)
    expect(mockMethod).toHaveBeenNthCalledWith(1, ...expectedCallArgs)

    mockMethod.mockRejectedValueOnce(errorFactory())

    await expect(fn(...args)).rejects.toThrow(expectedErrorMessage)
    expect(mockMethod).toHaveBeenNthCalledWith(2, ...expectedCallArgs)
  })

  it.each(requestErrorCases)('should_wrap_response_and_throw_request_error_when_%s_request_is_processed', async ({
    fn,
    method,
    args,
    expectedCallArgs,
    errorFactory,
    expectedErrorMessage,
    expectedStatus,
    expectedIsNetworkError,
  }) => {
    const mockMethod = apiClientMock[method]
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { source: method },
    }

    mockMethod.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(fn(...args)).resolves.toEqual(responseData)
    expect(mockMethod).toHaveBeenNthCalledWith(1, ...expectedCallArgs)

    mockMethod.mockRejectedValueOnce(errorFactory())

    await expect(fn(...args)).rejects.toSatisfy((error) => {
      expectRequestError(error, expectedErrorMessage, expectedStatus, expectedIsNetworkError)
      return true
    })
    expect(mockMethod).toHaveBeenNthCalledWith(2, ...expectedCallArgs)
  })

  it('should_return_access_token_payload_and_network_request_error_when_refresh_session_is_processed', async () => {
    refreshAccessTokenMock.mockResolvedValueOnce('fresh-token')

    await expect(refreshSession()).resolves.toEqual({
      data: {
        accessToken: 'fresh-token',
      },
    })

    refreshAccessTokenMock.mockRejectedValueOnce(createMessageOnlyError('Network Error'))

    await expect(refreshSession()).rejects.toSatisfy((error) => {
      expectRequestError(error, 'Network Error', null, true)
      return true
    })
  })

  it('should_send_plain_payload_when_create_post_receives_non_multipart_request', async () => {
    const payload = {
      category: 'FREE',
      title: '일반 글',
      content: '본문',
    }
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { id: 1 },
    }

    apiClientMock.post.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(createPost(payload)).resolves.toEqual(responseData)
    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/api/posts', payload)

    apiClientMock.post.mockRejectedValueOnce(createResponseError('게시글 저장 실패'))

    await expect(createPost(payload)).rejects.toThrow('게시글 저장 실패')
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, '/api/posts', payload)
  })

  it('should_build_form_data_when_create_post_receives_retained_attachment_ids_without_images', async () => {
    const payload = {
      category: 'FREE',
      title: '첨부 유지 글',
      content: '본문',
      retainedAttachmentIds: [3, 5],
    }
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { id: 2 },
    }

    apiClientMock.post.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(createPost(payload)).resolves.toEqual(responseData)

    const [, formData] = apiClientMock.post.mock.calls[0]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.getAll('images')).toHaveLength(0)

    const requestBlob = formData.get('request')
    expect(requestBlob).toBeInstanceOf(Blob)
    expect(JSON.parse(await requestBlob.text())).toEqual({
      category: 'FREE',
      title: '첨부 유지 글',
      content: '본문',
      retainedAttachmentIds: [3, 5],
    })
  })

  it('should_build_form_data_when_update_post_receives_images_and_retained_attachment_ids', async () => {
    const image = new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' })
    const payload = {
      category: 'FREE',
      title: '수정 글',
      content: '본문',
      images: [image],
      retainedAttachmentIds: [9],
    }
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { id: 9 },
    }

    apiClientMock.put.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(updatePost(9, payload)).resolves.toEqual(responseData)

    const [, formData] = apiClientMock.put.mock.calls[0]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.getAll('images')).toHaveLength(1)
    expect(formData.getAll('images')[0]).toBe(image)

    const requestBlob = formData.get('request')
    expect(JSON.parse(await requestBlob.text())).toEqual({
      category: 'FREE',
      title: '수정 글',
      content: '본문',
      retainedAttachmentIds: [9],
    })
  })

  it('should_build_form_data_without_retained_attachment_ids_when_create_post_receives_images_only', async () => {
    const image = new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' })
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { id: 3 },
    }

    apiClientMock.post.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(createPost({
      category: 'FREE',
      title: '이미지 글',
      content: '본문',
      images: [image],
    })).resolves.toEqual(responseData)

    const [, formData] = apiClientMock.post.mock.calls[0]
    const requestBlob = formData.get('request')

    expect(JSON.parse(await requestBlob.text())).toEqual({
      category: 'FREE',
      title: '이미지 글',
      content: '본문',
    })
  })

  it('should_send_plain_payload_and_throw_generic_error_when_update_post_receives_non_multipart_request', async () => {
    const payload = {
      category: 'FREE',
      title: '일반 수정 글',
      content: '본문',
    }
    const responseData = {
      status: 'OK',
      message: '성공',
      data: { id: 9 },
    }

    apiClientMock.put.mockResolvedValueOnce(createAxiosResponse(responseData))

    await expect(updatePost(9, payload)).resolves.toEqual(responseData)
    expect(apiClientMock.put).toHaveBeenNthCalledWith(1, '/api/posts/9', payload)

    apiClientMock.put.mockRejectedValueOnce(createResponseError('게시글 수정 실패'))

    await expect(updatePost(9, payload)).rejects.toThrow('게시글 수정 실패')
    expect(apiClientMock.put).toHaveBeenNthCalledWith(2, '/api/posts/9', payload)
  })
})
