import React, { useEffect, useState } from 'react';
import useMemberStore from '../../stores/useMemberStore';
import { getMyRecords, deleteRecord } from '../../api/requests';
import { formatDate } from '../../utils/dateUtils';
import {
  MypageContainer,
  ProfileSection,
  SectionTitle,
  RecordTable,
  StatsGrid,
  StatBox,
} from './MemberStyled';

const Mypage = () => {
  const { user } = useMemberStore();
  const [records, setRecords] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    best: 0,
    avg: 0
  });

  useEffect(() => {
    if (user) {
      fetchMyData();
    }
  }, [user]);

  const fetchMyData = async () => {
    try {
      const recordData = await getMyRecords(user.id);
      setRecords(recordData);

      const sorted = recordData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(sorted);

      if (sorted.length > 0) {
        const times = sorted.map(r => r.time);
        const total = sorted.length;
        const best = Math.min(...times);
        const sum = times.reduce((acc, cur) => acc + cur, 0);
        const avg = (sum / total).toFixed(3);

        setStats({ total, best, avg });
      } else {
        setStats({ total: 0, best: 0, avg: 0 });
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    }
  };

  const handleDelete = async (recordId) => {
    if (window.confirm("정말 이 기록을 삭제하시겠습니까?")) {
      try {
        await deleteRecord(recordId);
        alert("삭제되었습니다.");
        fetchMyData();
      } catch (error) {
        console.error("삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

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

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ flex: 1 }}>
          <SectionTitle>내 기록</SectionTitle>
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
                <tr><td colSpan="3">기록이 없습니다.</td></tr>
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
        </div>
      </div>
    </MypageContainer>
  );
};

export default Mypage;