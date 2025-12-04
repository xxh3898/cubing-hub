import React, { useEffect, useRef, useState } from 'react'
import useMemberStore from '../../stores/useMemberStore'
import useTimerStore from '../../stores/useTimerStore';
import { GuideText, ScrambleText, TimeDisplay, TimerContainer } from './TimerStyled';

const Timer = () => {
  const { addRecord, user } = useMemberStore();
  const { scramble, updateScramble } = useTimerStore();

  const [time, setTime] = useState(0);
  const [status, setStatus] = useState('idle');

  const statusRef = useRef('idle');
  const startTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    updateScramble();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (e.repeat) return;

      if (statusRef.current === 'running') {
        clearInterval(timerIntervalRef.current);

        const endTime = Date.now();
        const diff = endTime - startTimeRef.current;
        const finalTime = diff / 1000;

        setTime(diff);

        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        if (user) {
          addRecord({
            id: Date.now(),
            time: parseFloat(finalTime.toFixed(3)),
            date: formattedDate,
            scramble: useTimerStore.getState().scramble
          });
        }

        updateScramble();

        statusRef.current = 'idle';
        setStatus('idle');

      } else if (statusRef.current === 'idle') {
        setTime(0);
        statusRef.current = 'holding';
        setStatus('holding');
      }
    };

    const handleKeyUp = (e) => {
      if (e.code !== 'Space') return;

      if (statusRef.current === 'holding') {
        startTimeRef.current = Date.now();
        statusRef.current = 'running';
        setStatus('running');

        timerIntervalRef.current = setInterval(() => {
          setTime(Date.now() - startTimeRef.current);
        }, 10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const formatTime = (ms) => {
    return (ms / 1000).toFixed(3);
  };

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
  )
}

export default Timer;