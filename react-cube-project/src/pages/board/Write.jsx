import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useBoardStore from '../../stores/useBoardStore'
import useMemberStore from '../../stores/useMemberStore'
import { BoardContainer, Button, ButtonGroup, FormContainer, Input, Table, Textarea, Title } from './BoardStyled'

const Write = () => {
  const navigate = useNavigate();
  const { addPost } = useBoardStore();
  const { user } = useMemberStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    addPost(title, content, user.name, user.id);
    
    alert("게시글이 등록되었습니다!");
    navigate('/board');
  }

  return (
    <BoardContainer>
      <Title>게시글 작성</Title>

      <FormContainer>
        <Input
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="내용을 자유롭게 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </FormContainer>

      <ButtonGroup style={{ marginTop: '20px' }}>
        <Button
          onClick={() => navigate(-1)}
          style={{ background: '#999', marginRight: '10px' }}
        >
          취소
        </Button>
        <Button onClick={handleSubmit}>등록하기</Button>
      </ButtonGroup>
    </BoardContainer>
  )
}

export default Write