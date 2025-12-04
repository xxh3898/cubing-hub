import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';
import useMemberStore from '../stores/useMemberStore';
import { HeroSection, HomeContainer, Title, SubTitle, TipBox } from './HomeStyled';
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
    </HomeContainer>
  )

}

export default Home