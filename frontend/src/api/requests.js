import client from './client';

export const signup = async (memberData) => {
  const response = await client.post('/members/signup', memberData);
  return response.data;
};

export const login = async (id, password) => {
  const response = await client.post('/members/login', { id, password });
  return response.data;
};


export const getPosts = async () => {
  const response = await client.get('/posts');
  return response.data;
};

export const writePost = async (postData, memberId) => {
  const response = await client.post(`/posts?memberId=${memberId}`, postData);
  return response.data;
};


export const saveRecord = async (recordData, memberId) => {
  const response = await client.post(`/records?memberId=${memberId}`, recordData);
  return response.data;
};

export const getPost = async (postId) => {
  const response = await client.get(`/posts/${postId}`);
  return response.data;
};

export const deletePost = async (postId, memberId) => {
  const response = await client.delete(`/posts/${postId}?memberId=${memberId}`);
  return response.data;
};

export const updatePost = async (postId, postData, memberId) => {
  const response = await client.put(`/posts/${postId}?memberId=${memberId}`, postData);
  return response.data;
};