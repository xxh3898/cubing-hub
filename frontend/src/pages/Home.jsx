import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import useMemberStore from '../stores/useMemberStore';
import { getMyRecords } from '../api/requests';
import { HeroSection, HomeContainer, Title, SubTitle, TipBox, Area, Card, CardTitle, CardDesc, CardRecord, CardRecordSpan, Highlight, Tip, TodayTip } from './HomeStyled';

const Home = () => {
  const [tip, setTip] = useState('');
  const { user } = useMemberStore();
  const [records, setRecords] = useState([]);

  const tips = [
    "F2L은 속도보다 '끊김 없는(Look Ahead)' 플레이가 중요합니다.",
    "OLL 공식을 외울 때는 손가락의 움직임(Finger Trick)을 기억하세요.",
    "큐브 윤활유를 바르면 기록 단축에 큰 도움이 됩니다.",
    "PLL 판단 시간을 줄이는 것이 20초 진입의 핵심입니다.",
    "Cross는 8회전 이내에 맞추도록 연습해보세요.",
  ];

  useEffect(() => {
    setTip(tips[Math.floor(Math.random() * tips.length)]);

    if (user) {
      getMyRecords(user.id).then(data => {
        setRecords(data);
      }).catch(e => console.error("기록 로딩 실패", e));
    }
  }, [user]);

  const hasRecords = records.length > 0;
  const times = hasRecords ? records.map(r => r.time) : [];
  const bestRecord = hasRecords ? Math.min(...times) : 0;
  const avgRecord = hasRecords ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0;

  const recentRecords = hasRecords ? records.slice().reverse().slice(0, 5) : [];

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
  )
}

export default Home;