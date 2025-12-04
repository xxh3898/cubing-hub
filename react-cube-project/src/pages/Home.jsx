import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';
import useMemberStore from '../stores/useMemberStore';
import { HeroSection, HomeContainer, Title, SubTitle, TipBox, Area, Card, CardTitle, CardDesc, CardRecord, CardRecordSpan, Highlight } from './HomeStyled';
import { Tip, TodayTip } from './HomeStyled';

const Home = () => {
  const [tip, setTip] = useState('');
  const { user } = useMemberStore();

  const tips = [
    "F2L은 속도보다 '끊김 없는(Look Ahead)' 플레이가 중요합니다.",
    "OLL 공식을 외울 때는 손가락의 움직임(Finger Trick)을 기억하세요.",
    "큐브 윤활유를 바르면 기록 단축에 큰 도움이 됩니다.",
    "PLL 판단 시간을 줄이는 것이 20초 진입의 핵심입니다.",
    "Cross는 8회전 이내에 맞추도록 연습해보세요.",
    "Slow Turning 연습은 미리 다음 상황을 보는 눈을 길러줍니다."
  ]

  useEffect(() => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setTip(randomTip);
  }, []);

  const name = user?.name ?? '게스트';
  const records = user?.records ?? [];
  const hasRecords = records.length > 0;

  const times = hasRecords ? records.map(r => r.time) : [];
  const bestRecord = hasRecords ? Math.min(...times) : 0;
  const avgRecord = hasRecords ?
    (times.reduce((a, b) => a + b, 0) / times.length).toFixed(3) : 0;

  const recentRecords = hasRecords ? [...records].reverse().slice(0, 5) : [];
  const recentTimes = recentRecords.map(r => r.time);
  const recentBest = Math.min(...recentTimes)
  const recentWorst = Math.max(...recentTimes)

  return (
    <HomeContainer>
      <HeroSection>
        <Title>{user ? `안녕하세요! ${name}님!` : '로그인이 필요합니다'}</Title>
        <SubTitle>오늘도 최고 기록에 도전해보세요!</SubTitle>

        <TipBox>
          <TodayTip>💡 오늘의 큐빙 Tip</TodayTip>
          <Tip>"{tip}"</Tip>
        </TipBox>
      </HeroSection>

      <Area>
        {user ? (
          <Card to={'/mypage'} color='yellow'>
            <CardTitle>👤 {name}님의 기록</CardTitle>
            <CardDesc>
              <CardRecord>평균 기록: <strong>{hasRecords ? `${avgRecord}초` : '기록 없음'}</strong></CardRecord>
              <CardRecord>최고 기록: <Highlight color="#24854cff">{hasRecords ? `${bestRecord}초` : '기록 없음'}</Highlight></CardRecord>
              <div>
                최근 5회: <br />
                {hasRecords ? (
                  <CardRecordSpan>
                    {recentRecords.map((r, i) => {
                      let color = undefined;
                      if (r.time === recentBest) color = "green";
                      else if (r.time === recentWorst) color = "red";
                      return (
                        <span key={i}>
                          <Highlight color={color}>{r.time}초</Highlight>
                          {i < recentRecords.length - 1 ? <br /> : ''}
                        </span>
                      )
                    })}
                  </CardRecordSpan>
                ) : (
                  <span>아직 기록이 없습니다.</span>
                )}
              </div>
            </CardDesc>
          </Card>
        ) : (
          <Card to={'/login'} color='red'>
            <CardTitle>🔒 로그인 필요</CardTitle>
            <CardDesc>
              기록을 보려면 로그인이 필요합니다.<br />
              여기를 눌러 로그인하세요.
            </CardDesc>
          </Card>
        )}

        <Card to={'/timer'} color='green'>
          <CardTitle>⏱️ 큐브 타이머</CardTitle>
          <CardDesc>실시간으로 큐브 기록을 측정하고<br />저장해보세요.</CardDesc>
        </Card>

        <Card to={'/algorithms'} color='blue'>
          <CardTitle>📚 알고리즘</CardTitle>
          <CardDesc>OLL, PLL 등 필수 공식을<br />익혀보세요.</CardDesc>
        </Card>

        <Card to={'/board'} color='purple'>
          <CardTitle>🗣️ 커뮤니티</CardTitle>
          <CardDesc>다른 큐버들과 정보를 공유하고<br />이야기를 나누세요.</CardDesc>
        </Card>
      </Area>
    </HomeContainer>
  )

}

export default Home