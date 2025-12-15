import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useMemberStore from '../../stores/useMemberStore';
import { writePost } from '../../api/requests';
import {
  BoardContainer,
  Title,
  InputGroup,
  Textarea,
  ButtonGroup,
  Button
} from './BoardStyled';

const Write = () => {
  const navigate = useNavigate();
  const { user } = useMemberStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      navigate('/login');
      return;
    }

    try {
      await writePost({ title, content }, user.id);

      alert("게시글이 등록되었습니다.");
      navigate('/board');
    } catch (error) {
      console.error("글쓰기 실패:", error);
      alert("글 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <BoardContainer>
      <Title>게시글 작성</Title>

      <InputGroup>
        <label>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
      </InputGroup>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
      />

      <ButtonGroup>
        <Button onClick={handleSubmit}>등록</Button>
        <Button cancel onClick={() => navigate('/board')}>취소</Button>
      </ButtonGroup>
    </BoardContainer>
  );
};

export default Write;