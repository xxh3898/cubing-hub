import { Link } from "react-router-dom";
import styled from "styled-components";

/* =========================================
   1. 전체 레이아웃 (Layout Wrapper)
   ========================================= */
export const HomeContainer = styled.div`
    width: 100%;
    padding-bottom: 40px;
    background-color: #f8f9fa;
`

/* =========================================
   2. 상단 배너 섹션 (Hero Section)
   ========================================= */
export const HeroSection = styled.div`
    background: linear-gradient(135deg, #cff0cde7 0%, #44d167ff 100%);
    padding: 60px 20px;
    text-align: center;
    color: white;
    
    margin-bottom: -40px; 
    padding-bottom: 90px; 

    @media (max-width: 768px) {
        padding: 40px 20px;
        padding-bottom: 70px;
    }
`

export const Title = styled.h2`
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    margin-bottom: 10px;
    color: #2c3e50;
    
    @media (max-width: 768px) {
        font-size: 22px;
    }

    span {
        color: #5833ffff; 
    }
`

export const SubTitle = styled.p`
    font-size: 16px;
    opacity: 0.9;
    margin: 0;
    margin-bottom: 30px;
    color: #7e2222ff;

    @media (max-width: 768px) {
        font-size: 14px;
    }
`

export const TipBox = styled.div`
    background: #f8f9fa;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    text-align: center;
    
    font-family: monospace; 
    font-size: 18px;
    color: #444;
    border: 1px solid #ccc;
    
    display: inline-block; 
    min-width: 300px;
    max-width: 90%;

    @media (max-width: 768px) {
        font-size: 14px;
        min-width: auto;
        width: 100%;
    }
`

export const TodayTip = styled.div`
    font-size: 14px;
    opacity: 0.8;
    margin-bottom: 8px;
`

export const Tip = styled.div`
    font-weight: 500;
    font-size: 18px;
    word-break: keep-all;

    @media (max-width: 768px) {
        font-size: 16px;
    }
`

/* =========================================
   3. 메인 콘텐츠 영역 (Cards)
   ========================================= */
export const Area = styled.div`
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin: 0 auto;
    padding: 0 20px;
    max-width: 1200px;
    
    transform: translateY(-40px); 

    @media (max-width: 768px) {
        padding: 0 15px;
        gap: 15px;
    }
`

export const Card = styled(Link)`
    background: #ffffff;
    flex: 1;
    min-width: 240px;
    padding: 32px;
    border-radius: 16px;   
    text-decoration: none;
    color: #333;
    
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
    border: 1px solid transparent;

    border-top: 6px solid ${props => props.color || '#5833ffff'}; 

    @media (max-width: 480px) {
        min-width: 100%;
        padding: 24px;
    }

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 20px rgba(88, 51, 255, 0.15);
        
        h3 {
            color: #5833ffff;
        }
    }
`

export const CardTitle = styled.h3`
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 12px;
    color: #222;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.3s ease;
`

export const CardDesc = styled.div`
    font-size: 15px;
    color: #666;
    line-height: 1.6;
    margin: 0;
    word-break: keep-all;
`

export const CardRecord = styled.div`
    margin-bottom: 8px;
`

export const CardRecordSpan = styled.span`
    font-size: 14px;
    color: #555;
`

/* =========================================
   4. 유틸리티 (Utils)
   ========================================= */
export const Highlight = styled.span`
    color: ${props => props.color || '#333'};
    font-weight: bold;
`