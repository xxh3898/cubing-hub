import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useMemberStore from '../../stores/useMemberStore';
import { getPost, updatePost } from '../../api/requests';
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
  const { user } = useMemberStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPost(id);

        if (!user || user.id !== data.authorId) {
          alert("수정 권한이 없습니다.");
          navigate('/board');
          return;
        }

        setTitle(data.title);
        setContent(data.content);
      } catch (e) {
        alert("게시글 정보를 가져오지 못했습니다.");
        navigate('/board');
      }
    };
    fetchPost();
  }, [id, user, navigate]);

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await updatePost(id, { title, content }, user.id);
      alert("수정되었습니다.");
      navigate(`/board/${id}`);
    } catch (e) {
      console.error(e);
      alert("수정 실패!");
    }
  };

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
        <Button onClick={handleUpdate}>수정 완료</Button>
      </ButtonGroup>
    </BoardContainer>
  );
};

export default Edit;