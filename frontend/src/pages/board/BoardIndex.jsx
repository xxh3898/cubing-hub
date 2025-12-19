import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useBoard from '../../hooks/useBoard';
import useMemberStore from '../../stores/useMemberStore';
import { formatDate } from '../../utils/dateUtils.js';
import {
  BoardContainer,
  Title,
  Table,
  TableWrapper,
  Button,
  ButtonGroup
} from './BoardStyled';

const BoardIndex = () => {
  const navigate = useNavigate();
  const { user } = useMemberStore();
  const { posts } = useBoard();

  return (
    <BoardContainer>
      <Title>게시판</Title>

      <TableWrapper>
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
                  <td>{formatDate(post.createTime)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrapper>

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