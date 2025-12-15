import { Link } from "react-router-dom";
import styled from "styled-components";

/* =========================================
   1. 공통 & 로그인/회원가입 (Auth)
   ========================================= */
export const Container = styled.div`
    width: 1000px;
    height: 700px;
    margin: 60px auto;
    padding: 40px;
    
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;
`

export const Title = styled.h2`
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin-bottom: 30px;
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
    padding: 40px 20px;
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
`;

export const RecordTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);

    th, td {
        padding: 15px;
        text-align: center;
        border-bottom: 1px solid #eee;
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
    }

    .label {
        font-weight: 600;
        color: #888;
        font-size: 15px;
    }
`;