import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useBoardStore from '../../stores/useBoardStore'
import useMemberStore from '../../stores/useMemberStore'
import { BoardContainer, Button, ButtonGroup, Table, Title } from './BoardStyled'

const BoardIndex = () => {
  const { posts } = useBoardStore();
  const { user } = useMemberStore();
  const navigate = useNavigate();

  const handleWriteClick = () => {
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      navigate('/login');
      return;
    }
    navigate('/board/write');
  }

  const getPreview = (content) => {
    if (content.length > 40) {
      return content.slice(0, 40) + "...";
    }
    return content;
  };

  return (
    <BoardContainer>
      <Title>자유 게시판</Title>

      <Table>
        <colgroup>
          <col width="20%" />
          <col width="*" />
          <col width="15%" />
          <col width="15%" />
        </colgroup>
        <thead>
          <tr>
            <th>제목</th>
            <th>내용</th>
            <th>작성자</th>
            <th>작성일</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '50px 0', color: '#999' }}>
                작성된 게시글이 없습니다.
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id}>
                <td className="title">
                  <Link to={`/board/${post.id}`}>
                    {post.title}
                  </Link>
                </td>
                <td className="content-preview">
                  <Link to={`/board/${post.id}`}>
                    {getPreview(post.content)}
                  </Link>
                </td>
                <td>{post.author}</td>
                <td>{post.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <ButtonGroup>
        <Button onClick={handleWriteClick}>글쓰기</Button>
      </ButtonGroup>
    </BoardContainer>
  )
}

export default BoardIndex