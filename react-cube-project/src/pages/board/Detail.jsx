import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useBoardStore from '../../stores/useBoardStore';
import useMemberStore from '../../stores/useMemberStore';
import {
  BoardContainer,
  Title,
  PostWrapper,
  PostHeader,
  PostTitle,
  PostInfo,
  PostContent,
  ButtonGroup,
  Button,
  SecondaryButton
} from './BoardStyled';

const Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { posts, initializeBoard, deletePost } = useBoardStore();
  const { user } = useMemberStore();

  const post = posts.find((p) => p.id === Number(id));

  useEffect(() => {
    if (posts.length === 0) {
      initializeBoard();
    }
  }, [posts, initializeBoard]);

  const handleDelete = () => {
    if (!user || user.name !== post.author) {
      alert("권한이 없습니다.");
      return;
    }

    if (window.confirm("정말로 삭제하시겠습니까?")) {
      deletePost(id);
      alert("삭제되었습니다.");
      navigate('/board');
    }
  };

  if (!post) {
    return (
      <BoardContainer>
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>
          게시글을 찾을 수 없습니다.
        </div>
        <ButtonGroup style={{ justifyContent: 'center' }}>
          <SecondaryButton onClick={() => navigate('/board')}>
            목록으로 돌아가기
          </SecondaryButton>
        </ButtonGroup>
      </BoardContainer>
    );
  }

  const isAuthor = user && user.id === post.authorId;

  return (
    <BoardContainer>
      <Title>게시판</Title>

      <PostWrapper>
        <PostHeader>
          <PostTitle>{post.title}</PostTitle>
          <PostInfo>
            <span><strong>작성자</strong> {post.author}</span>
            <span><strong>작성일</strong> {post.date}</span>
          </PostInfo>
        </PostHeader>

        <PostContent>
          {post.content}
        </PostContent>
      </PostWrapper>

      <ButtonGroup>
        <SecondaryButton onClick={() => navigate('/board')}>
          목록으로
        </SecondaryButton>

        {isAuthor && (
          <>
            <Button onClick={() => navigate(`/board/edit/${id}`)}>
              수정
            </Button>
            <SecondaryButton onClick={handleDelete}>
              삭제
            </SecondaryButton>
          </>
        )}
      </ButtonGroup>

    </BoardContainer>
  );
};

export default Detail;