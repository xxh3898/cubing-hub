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
  BadgeGrid,
  BadgeItem,
  LevelBadge
} from './MemberStyled';

const BADGE_META = {
  SPEED_SUB_60: { icon: '⚡', label: '1분 돌파' },
  SPEED_SUB_30: { icon: '🚀', label: '30초 돌파' },
  SPEED_SUB_20: { icon: '🔥', label: '20초 돌파' },
  SPEED_SUB_10: { icon: '👑', label: '10초 돌파' },
  COUNT_10: { icon: '🌱', label: '시작이 반' },
  COUNT_100: { icon: '🌿', label: '꾸준함' },
  COUNT_1000: { icon: '🌳', label: '마스터' },
};

const Mypage = () => {
  const { user, profile, records, stats, handleDelete } = useMypage();

  if (!user) {
    return <MypageContainer>로그인이 필요합니다.</MypageContainer>;
  }

  // Determine which badges are unlocked
  const unlockedBadges = profile?.achievements?.map(a => a.type) || [];

  return (
    <MypageContainer>
      <ProfileSection>
        <h2>
          {user.name}님의 마이페이지
          <LevelBadge level={profile?.level || 'Rookie'}>{profile?.level || 'Rookie'}</LevelBadge>
        </h2>
        <div className="info-grid">
          <div className="label">아이디</div>
          <div>{user.id}</div>
          <div className="label">나이</div>
          <div>{user.age}세</div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>업적 (Archievements)</h3>
          <BadgeGrid>
            {Object.keys(BADGE_META).map(key => {
              const isUnlocked = unlockedBadges.includes(key);
              const meta = BADGE_META[key];
              return (
                <BadgeItem key={key} isLocked={!isUnlocked}>
                  <div className="icon">{isUnlocked ? meta.icon : '🔒'}</div>
                  <div className="name">{meta.label}</div>
                  <div className="desc">{isUnlocked ? '획득 완료!' : '잠금 상태'}</div>
                </BadgeItem>
              );
            })}
          </BadgeGrid>
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