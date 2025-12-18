import React from 'react';
import { useNavigate } from 'react-router-dom';
import usePostForm from '../../hooks/usePostForm';
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
  const { title, setTitle, content, setContent, handleSubmit } = usePostForm();

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