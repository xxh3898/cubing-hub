import React from 'react';
import useMypage from '../../hooks/useMypage';
import { formatDate } from '../../utils/dateUtils';
import {
  MypageContainer,
  ProfileSection,
  SectionTitle,
  RecordTable,
  TableWrapper,
  StatsGrid,
  StatBox,
} from './MemberStyled';

const Mypage = () => {
  const { user, records, stats, handleDelete } = useMypage();

  if (!user) {
    return <MypageContainer>로그인이 필요합니다.</MypageContainer>;
  }

  return (
    <MypageContainer>
      <ProfileSection>
        <h2>{user.name}님의 마이페이지</h2>
        <div className="info-grid">
          <div className="label">아이디</div>
          <div>{user.id}</div>
          <div className="label">나이</div>
          <div>{user.age}세</div>
        </div>
      </ProfileSection>

      <SectionTitle>나의 기록 통계</SectionTitle>
      <StatsGrid>
        <StatBox>
          <span className="label">총 솔빙 수</span>
          <span className="value">{stats.total}회</span>
        </StatBox>
        <StatBox>
          <span className="label">최고 기록(PB)</span>
          <span className="value highlight">{stats.best}초</span>
        </StatBox>
        <StatBox>
          <span className="label">전체 평균</span>
          <span className="value">{stats.avg}초</span>
        </StatBox>
      </StatsGrid>

      <div style={{ marginTop: '2rem' }}>
        <SectionTitle>내 기록</SectionTitle>

        <TableWrapper>
          <RecordTable>
            <thead>
              <tr>
                <th>날짜</th>
                <th>시간</th>
                <th>스크램블</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="4">기록이 없습니다.</td></tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td className="time">{record.time}초</td>
                    <td className="scramble" title={record.scramble}>
                      {record.scramble}
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(record.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </RecordTable>
        </TableWrapper>
      </div>
    </MypageContainer>
  );
};

export default Mypage;