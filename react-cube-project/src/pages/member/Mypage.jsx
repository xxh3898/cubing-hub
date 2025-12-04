import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMemberStore from '../../stores/useMemberStore';
import { MypageContainer, SectionTitle, TopSection, ProfileCard, StatsGrid, StatBox, RecordTable, EmptyMsg } from './MemberStyled';

const Mypage = () => {
  const navigate = useNavigate();
  const { user, removeRecord } = useMemberStore();

  useEffect(() => {
    if (!user) {
      alert("로그인이 필요한 페이지입니다.");
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const records = user.records || [];
  const totalSolves = records.length;

  const times = records.map(r => r.time);
  const bestTime = totalSolves > 0 ? Math.min(...times) : '-';

  const avgTime = totalSolves > 0
    ? (times.reduce((a, b) => a + b, 0) / totalSolves).toFixed(3)
    : '-';

  const handleDelete = (id) => {
    if (window.confirm("이 기록을 삭제하시겠습니까?")) {
      removeRecord(id);
    }
  };

  const sortedRecords = [...records].reverse();

  return (
    <MypageContainer>

      <SectionTitle>내 정보 & 통계</SectionTitle>

      <TopSection>
        <ProfileCard>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>👤</div>
          <h3>{user.name}</h3>
          <p>ID: {user.id}</p>
          <p>나이: {user.age}세</p>
        </ProfileCard>

        <StatsGrid>
          <StatBox>
            <span className="label">총 솔빙 수</span>
            <span className="value">{totalSolves}회</span>
          </StatBox>
          <StatBox>
            <span className="label">최고 기록 (PB)</span>
            <span className="value highlight">{bestTime}s</span>
          </StatBox>
          <StatBox>
            <span className="label">전체 평균</span>
            <span className="value">{avgTime}s</span>
          </StatBox>
        </StatsGrid>
      </TopSection>

      <SectionTitle top>타이머 기록 ({totalSolves})</SectionTitle>

      {totalSolves === 0 ? (
        <EmptyMsg>
          아직 기록이 없습니다. <br />
          타이머 메뉴에서 첫 기록을 세워보세요!
        </EmptyMsg>
      ) : (
        <RecordTable>
          <colgroup>
            <col width="20%" />
            <col width="15%" />
            <col width="*" />
            <col width="10%" />
          </colgroup>
          <thead>
            <tr>
              <th>날짜</th>
              <th>기록</th>
              <th>스크램블 (섞기 공식)</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td style={{ fontWeight: 'bold', color: record.time === bestTime ? '#5833ff' : '#333' }}>
                  {record.time}s
                </td>
                <td className="scramble">{record.scramble}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDelete(record.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </RecordTable>
      )}

    </MypageContainer>
  );
};

export default Mypage;