import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useMemberStore from '../../stores/useMemberStore';
import { getPost, deletePost } from '../../api/requests';
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useMemberStore();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPost(id);
        setPost(data);
      } catch (error) {
        console.error("게시글 로딩 실패:", error);
        alert("게시글을 불러올 수 없습니다.");
        navigate('/board');
      }
    };
    fetchPost();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!user || user.id !== post.authorId) {
      alert("삭제 권한이 없습니다.");
      return;
    }

    if (window.confirm("정말로 삭제하시겠습니까?")) {
      try {
        await deletePost(id, user.id);
        alert("삭제되었습니다.");
        navigate('/board');
      } catch (e) {
        alert("삭제 실패!");
      }
    }
  };

  if (!post) return <BoardContainer>로딩 중...</BoardContainer>;

  const isAuthor = user && user.id === post.authorId;

  return (
    <BoardContainer>
      <Title>게시판</Title>
      <PostWrapper>
        <PostHeader>
          <PostTitle>{post.title}</PostTitle>
          <PostInfo>
            <span><strong>작성자</strong> {post.author || post.authorId}</span>
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