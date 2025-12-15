import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPosts } from '../../api/requests';
import useMemberStore from '../../stores/useMemberStore';
import { formatDate } from '../../utils/dateUtils.js';
import {
  BoardContainer,
  Title,
  Table,
  Button,
  ButtonGroup
} from './BoardStyled';

const BoardIndex = () => {
  const navigate = useNavigate();
  const { user } = useMemberStore();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPosts();
        setPosts(data);
        console.log("게시글 로딩 성공:", data);
      } catch (error) {
        console.error("게시글 로딩 실패:", error);
      }
    };

    fetchPosts();
  }, []);

  return (
    <BoardContainer>
      <Title>게시판</Title>

      <Table>
        <colgroup>
          <col width="10%" />
          <col width="*" />
          <col width="15%" />
          <col width="20%" />
        </colgroup>
        <thead>
          <tr>
            <th>번호</th>
            <th>제목</th>
            <th>작성자</th>
            <th>날짜</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '40px', color: '#999' }}>
                등록된 게시글이 없습니다.
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id}>
                <td>{post.id}</td>
                <td className="title">
                  <Link to={`/board/${post.id}`}>
                    {post.title}
                  </Link>
                </td>
                <td>{post.author}</td>
                <td>{formatDate(post.date)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {user && (
        <ButtonGroup>
          <Button onClick={() => navigate('/board/write')}>
            글쓰기
          </Button>
        </ButtonGroup>
      )}
    </BoardContainer>
  );
};

export default BoardIndex;