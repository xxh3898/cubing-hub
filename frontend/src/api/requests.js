import client from './client';

/* --- 1. 회원 (Member) --- */

// 회원가입
export const signup = async (memberData) => {
  // memberData 예시: { id: "user1", password: "123", name: "큐브왕", age: 25 }
  const response = await client.post('/members/signup', memberData);
  return response.data;
};

// 로그인
export const login = async (id, password) => {
  const response = await client.post('/members/login', { id, password });
  return response.data; // 성공 시 회원 정보(MemberDto) 반환
};

/* --- 2. 게시판 (Post) --- */

// 게시글 전체 조회
export const getPosts = async () => {
  const response = await client.get('/posts');
  return response.data; // 게시글 목록 배열 반환
};

// 게시글 작성
export const writePost = async (postData, memberId) => {
  // postData: { title: "제목", content: "내용" }
  // memberId: 현재 로그인한 사람 ID
  const response = await client.post(`/posts?memberId=${memberId}`, postData);
  return response.data;
};

/* --- 3. 기록 (Record) --- */

// 기록 저장
export const saveRecord = async (recordData, memberId) => {
  // recordData: { time: 12.55, scramble: "..." }
  const response = await client.post(`/records?memberId=${memberId}`, recordData);
  return response.data;
};

// 내 기록 조회
export const getMyRecords = async (memberId) => {
  const response = await client.get(`/records?memberId=${memberId}`);
  return response.data;
};