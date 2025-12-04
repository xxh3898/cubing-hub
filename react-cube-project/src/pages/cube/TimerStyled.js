import styled from "styled-components";

/* =========================================
   1. 전체 레이아웃 (Layout)
   ========================================= */
export const TimerContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    height: 70vh;
    text-align: center;
    cursor: pointer;
    outline: none;
`

/* =========================================
   2. 핵심 콘텐츠 (Scramble & Time)
   ========================================= */
export const ScrambleText = styled.div`
    font-size: 24px;
    font-weight: 500;
    color: #555;
    font-family: monospace;
    
    background: #f0f0f0;
    padding: 15px 30px;
    border-radius: 8px;
    margin-bottom: 40px;
    
    word-break: break-all;
    max-width: 90%;
`

export const TimeDisplay = styled.div`
    font-size: 120px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    margin-bottom: 20px;
    user-select: none;
    
    color: ${props => {
        if (props.status === 'running') return '#2ecc71';
        if (props.status === 'holding') return '#b2b2b2';
        return '#333';
    }};
`

/* =========================================
   3. 보조 텍스트 (Guide)
   ========================================= */
export const GuideText = styled.p`
    color: #999;
    font-size: 16px;
    margin-top: 20px;
`