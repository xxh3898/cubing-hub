import { Link } from "react-router-dom";
import styled from "styled-components";

/* =========================================
   1. 공통 & 로그인/회원가입 (Auth)
   ========================================= */
export const Container = styled.div`
    width: 90%;
    max-width: 500px;
    min-height: auto;
    margin: 40px auto;
    padding: 30px 20px;
    
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;

    @media (max-width: 480px) {
        padding: 20px;
        margin: 20px auto;
    }
`

export const Title = styled.h2`
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin-bottom: 30px;

    @media (max-width: 480px) {
        font-size: 24px;
    }
`

export const InputGroup = styled.div`
    margin-bottom: 16px;
    text-align: left;
    
    label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #555;
    }
    
    input, select {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 15px;
        box-sizing: border-box;
        transition: border-color 0.2s;

        &:focus {
            border-color: #5833ff;
            outline: none;
        }
    }
`

export const Button = styled.button`
    width: 100%;
    padding: 14px;
    
    background: #5833ff;
    color: white;
    
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 20px;
    transition: background 0.2s;

    &:hover {
        background: #4622e0;
    }
`

export const LinkText = styled(Link)`
    display: block;
    margin-top: 20px;
    
    color: #666;
    font-size: 14px;
    text-decoration: none;
    
    &:hover {
        text-decoration: underline;
        color: #5833ff;
    }
`

/* =========================================
   2. 마이페이지 (MyPage) 전용 스타일
   ========================================= */

export const MypageContainer = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;

    @media (max-width: 768px) {
        padding: 15px;
    }
`;

export const SectionTitle = styled.h2`
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin-bottom: 20px;
    margin-top: ${props => props.top ? '50px' : '0'};
    display: flex;
    align-items: center;
    gap: 10px;

    @media (max-width: 768px) {
        font-size: 20px;
    }
`;

export const TopSection = styled.div`
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    
    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

export const ProfileCard = styled.div`
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    text-align: center;
    
    h3 {
        margin: 10px 0 5px 0;
        font-size: 22px;
        color: #333;
    }
    
    p {
        color: #777;
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
    }
`;

export const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;

    @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const StatBox = styled.div`
    background: white;
    padding: 25px 20px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    
    span.label {
        font-size: 14px;
        color: #888;
        margin-bottom: 8px;
    }
    
    span.value {
        font-size: 28px;
        font-weight: 800;
        color: #333;
    }
    
    span.highlight {
        color: #5833ff;
    }

    @media (max-width: 768px) {
        padding: 20px 15px;
        span.value {
            font-size: 24px;
        }
    }
`;

export const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 20px;
`;

export const RecordTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    min-width: 500px;

    th, td {
        padding: 15px;
        text-align: center;
        border-bottom: 1px solid #eee;
        white-space: nowrap;
    }

    th {
        background: #f8f9fa;
        color: #555;
        font-weight: 600;
        font-size: 14px;
    }
    
    td {
        color: #333;
        font-size: 15px;
    }

    td.scramble {
        text-align: left;
        font-family: monospace;
        color: #666;
        font-size: 13px;
        white-space: normal;
        min-width: 200px;
    }

    button.delete-btn {
        background: #ffecec;
        color: #ff4d4d;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;

        &:hover {
            background: #ffdbdb;
        }
    }
`;

export const EmptyMsg = styled.div`
    text-align: center;
    padding: 50px;
    color: #999;
    background: white;
    border-radius: 12px;
    border: 1px dashed #ddd;
`;

export const ProfileSection = styled.div`
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    margin-bottom: 20px;

    @media (max-width: 768px) {
        padding: 20px;
    }

    h2 {
        font-size: 24px;
        font-weight: 700;
        color: #333;
        margin-bottom: 20px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
    }

    .info-grid {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 20px;
        align-items: center;
        max-width: 400px;

        @media (max-width: 480px) {
            grid-template-columns: 80px 1fr;
            gap: 10px;
        }
    }

    .label {
        font-weight: 600;
        color: #888;
        font-size: 15px;
    }
`;

export const BadgeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 20px;
    margin-top: 20px;
`;

export const BadgeItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    opacity: ${props => props.isLocked ? 0.4 : 1};
    filter: ${props => props.isLocked ? 'grayscale(100%)' : 'none'};
    transition: all 0.2s;
    
    &:hover {
        transform: translateY(-5px);
        opacity: 1;
        filter: none;
    }

    .icon {
        width: 60px;
        height: 60px;
        background: ${props => props.isLocked ? '#ddd' : '#e0d4ff'};
        color: ${props => props.isLocked ? '#999' : '#5833ff'};
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 24px;
        margin-bottom: 10px;
        box-shadow: ${props => props.isLocked ? 'none' : '0 4px 10px rgba(88, 51, 255, 0.2)'};
    }

    .name {
        font-size: 13px;
        font-weight: 700;
        color: #333;
        margin-bottom: 4px;
    }

    .desc {
        font-size: 11px;
        color: #888;
        line-height: 1.2;
    }
`;

export const LevelBadge = styled.span`
    display: inline-block;
    padding: 6px 12px;
    background: ${props => {
        switch (props.level) {
            case 'Master': return 'linear-gradient(135deg, #FFD700, #FFA500)';
            case 'Pro': return '#ff4d4d';
            case 'Amateur': return '#5833ff';
            case 'Beginner': return '#00C851';
            default: return '#999';
        }
    }};
    color: white;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 800;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    margin-left: 10px;
    vertical-align: middle;
`;