import React from 'react';
import { Link } from 'react-router-dom';
import useHome from '../hooks/useHome';
import { HeroSection, HomeContainer, Title, SubTitle, TipBox, Area, Card, CardTitle, CardDesc, CardRecord, CardRecordSpan, Highlight, Tip, TodayTip } from './HomeStyled';

const Home = () => {
  const {
    user, tip, hasRecords, bestRecord, avgRecord, recentRecords
  } = useHome();

  return (
    <HomeContainer>
      <HeroSection>
        <Title>{user ? `안녕하세요! ${user.name}님!` : '로그인이 필요합니다'}</Title>
        <SubTitle>오늘도 최고 기록에 도전해보세요!</SubTitle>
        <TipBox>
          <TodayTip>💡 오늘의 큐빙 Tip</TodayTip>
          <Tip>"{tip}"</Tip>
        </TipBox>
      </HeroSection>

      <Area>
        {user ? (
          <Card as={Link} to={'/mypage'} color='yellow'>
            <CardTitle>👤 {user.name}님의 기록</CardTitle>
            <CardDesc>
              <CardRecord>평균 기록: <strong>{hasRecords ? `${avgRecord}초` : '기록 없음'}</strong></CardRecord>
              <CardRecord>최고 기록: <Highlight color="#24854cff">{hasRecords ? `${bestRecord}초` : '기록 없음'}</Highlight></CardRecord>
              <div>
                최근 5회: <br />
                {hasRecords ? (
                  <CardRecordSpan>
                    {recentRecords.map((r, i) => (
                      <span key={i}>
                        <Highlight>{r.time}초</Highlight>
                        {i < recentRecords.length - 1 && <br />}
                      </span>
                    ))}
                  </CardRecordSpan>
                ) : <span>기록 없음</span>}
              </div>
            </CardDesc>
          </Card>
        ) : (
          <Card as={Link} to={'/login'} color='red'>
            <CardTitle>🔒 로그인 필요</CardTitle>
            <CardDesc>로그인하고 기록을 관리하세요.</CardDesc>
          </Card>
        )}
        <Card as={Link} to={'/timer'} color='green'>
          <CardTitle>⏱️ 큐브 타이머</CardTitle>
          <CardDesc>기록 측정하러 가기</CardDesc>
        </Card>
        <Card as={Link} to={'/algorithms'} color='blue'>
          <CardTitle>📚 알고리즘</CardTitle>
          <CardDesc>공식 모음집</CardDesc>
        </Card>
        <Card as={Link} to={'/board'} color='purple'>
          <CardTitle>🗣️ 커뮤니티</CardTitle>
          <CardDesc>자유 게시판</CardDesc>
        </Card>
      </Area>
    </HomeContainer>
  );
};

export default Home;