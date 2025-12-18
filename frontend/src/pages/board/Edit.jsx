import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usePostForm from '../../hooks/usePostForm';
import {
  BoardContainer,
  Title,
  FormContainer,
  Input,
  Textarea,
  ButtonGroup,
  Button,
  SecondaryButton
} from './BoardStyled';

const Edit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { title, setTitle, content, setContent, handleSubmit } = usePostForm(id);

  return (
    <BoardContainer>
      <Title>게시글 수정</Title>
      <FormContainer>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
        />
      </FormContainer>
      <ButtonGroup>
        <SecondaryButton onClick={() => navigate(-1)}>취소</SecondaryButton>
        <Button onClick={handleSubmit}>수정 완료</Button>
      </ButtonGroup>
    </BoardContainer>
  );
};

export default Edit;