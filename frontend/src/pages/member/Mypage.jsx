import React, { useEffect, useState } from 'react';
import useMemberStore from '../../stores/useMemberStore';
import { getMyRecords } from '../../api/requests';
import { formatDate } from '../../utils/dateUtils';
import {
  MypageContainer,
  ProfileSection,
  SectionTitle,
  RecordTable,
} from './MemberStyled';

const Mypage = () => {
  const { user } = useMemberStore();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMyData();
    }
  }, [user]);

  const fetchMyData = async () => {
    try {
      const recordData = await getMyRecords(user.id);
      setRecords(recordData);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
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

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ flex: 1 }}>
          <SectionTitle>내 기록 (최근 5개)</SectionTitle>
          <RecordTable>
            <thead>
              <tr>
                <th>날짜</th>
                <th>시간</th>
                <th>스크램블</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="3">기록이 없습니다.</td></tr>
              ) : (
                records.slice().reverse().slice(0, 5).map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td className="time">{record.time}초</td>
                    <td className="scramble" title={record.scramble}>
                      {record.scramble.substring(0, 15)}...
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