import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import usePostDetail from '../../hooks/usePostDetail';
import { formatDate } from '../../utils/dateUtils';
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
  const navigate = useNavigate();
  const { id } = useParams();

  const { post, isAuthor, handleDelete } = usePostDetail();

  if (!post) return <BoardContainer>로딩 중...</BoardContainer>;

  return (
    <BoardContainer>
      <Title>게시판</Title>
      <PostWrapper>
        <PostHeader>
          <PostTitle>{post.title}</PostTitle>
          <PostInfo>
            <span><strong>작성자</strong> {post.author}</span>
            <span><strong>작성일</strong> {formatDate(post.date)}</span>
          </PostInfo>
        </PostHeader>
        <PostContent>
          {post.content.split('\n').map((line, idx) => (
            <span key={idx}>{line}<br /></span>
          ))}
        </PostContent>
      </PostWrapper>

      <ButtonGroup>
        <SecondaryButton onClick={() => navigate('/board')}>목록으로</SecondaryButton>
        {isAuthor && (
          <>
            <Button onClick={() => navigate(`/board/edit/${id}`)}>수정</Button>
            <SecondaryButton onClick={handleDelete}>삭제</SecondaryButton>
          </>
        )}
      </ButtonGroup>
    </BoardContainer>
  );
};

export default Detail;