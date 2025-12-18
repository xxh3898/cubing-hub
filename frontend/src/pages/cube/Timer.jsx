import React from 'react';
import useCubeTimer from '../../hooks/useCubeTimer';
import { GuideText, ScrambleText, TimeDisplay, TimerContainer } from './TimerStyled';

const Timer = () => {
  const { time, status, scramble } = useCubeTimer();

  const formatTime = (ms) => (ms / 1000).toFixed(3);

  return (
    <TimerContainer>
      <ScrambleText>{scramble}</ScrambleText>

      <TimeDisplay status={status}>
        {formatTime(time)}
      </TimeDisplay>

      <GuideText>
        {status === 'idle' && "스페이스바를 꾹 눌러 준비하세요"}
        {status === 'holding' && "손을 떼면 시작합니다!"}
        {status === 'running' && "스페이스바를 눌러 멈추세요"}
      </GuideText>
    </TimerContainer>
  );
};

export default Timer;