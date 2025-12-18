import styled from "styled-components";

/* =========================================
   1. 타이머 & 공통 레이아웃
   ========================================= */
export const Container = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;

    @media (max-width: 768px) {
        padding: 20px 15px;
    }
`;

export const TimerContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    cursor: pointer;
    outline: none;
    user-select: none;
`;

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
    line-height: 1.4;

    @media (max-width: 768px) {
        font-size: 18px;
        padding: 12px 20px;
    }
`;

export const TimeDisplay = styled.div`
    font-size: 120px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    margin-bottom: 20px;
    
    color: ${props => {
        if (props.status === 'running') return '#2ecc71';
        if (props.status === 'holding') return '#e74c3c';
        if (props.status === 'ready') return '#2ecc71';
        return '#333';
    }};
    
    @media (max-width: 768px) {
        font-size: 80px;
    }
    @media (max-width: 480px) {
        font-size: 60px;
    }
`;

export const GuideText = styled.p`
    color: #999;
    font-size: 16px;
    margin-top: 20px;

    @media (max-width: 480px) {
        font-size: 14px;
    }
`;

/* =========================================
   2. 알고리즘 페이지 스타일
   ========================================= */

export const Title = styled.h2`
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin-bottom: 30px;
    border-left: 5px solid #5833ff;
    padding-left: 15px;

    @media (max-width: 768px) {
        font-size: 22px;
    }
`;

export const TabContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
    overflow-x: auto;
    
    &::-webkit-scrollbar {
        display: none;
    }
`;

export const TabButton = styled.button`
    padding: 10px 24px;
    border: none;
    background: ${props => props.active ? '#5833ff' : '#f1f3f5'};
    color: ${props => props.active ? 'white' : '#555'};
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 15px;
    white-space: nowrap;

    &:hover {
        background: ${props => props.active ? '#4622e0' : '#e2e6ea'};
        transform: translateY(-2px);
    }

    @media (max-width: 480px) {
        padding: 8px 16px;
        font-size: 14px;
    }
`;

export const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const AlgoCard = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s;
    border: 1px solid #eee;

    &:hover {
        transform: translateY(-5px);
        border-color: #5833ff;
    }
`;

export const AlgoImage = styled.img`
    width: 150px;
    height: 150px;
    object-fit: contain;
    margin-bottom: 15px;
    background-color: #fafafa; 
    border-radius: 8px;
`;

export const AlgoTitle = styled.h3`
    font-size: 18px;
    margin: 0 0 10px 0;
    color: #333;
    text-align: center;
`;

export const AlgoFormula = styled.div`
    background: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 14px;
    color: #555;
    text-align: center;
    width: 100%;
    word-break: break-word;
    line-height: 1.4;
    border: 1px solid #ddd;
`;