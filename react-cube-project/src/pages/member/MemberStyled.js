import { Link } from "react-router-dom";
import styled from "styled-components";

/* =========================================
   1. 전체 레이아웃 (Layout)
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

/* =========================================
   2. 타이틀 영역 (Title)
   ========================================= */
export const Title = styled.h2`
    font-size: 28px;
    font-weight: 700;
    color: #333;
    margin-bottom: 30px;
`

/* =========================================
   3. 입력 폼 영역 (Form Inputs)
   ========================================= */
export const InputGroup = styled.div`
    margin-bottom: 16px;
    text-align: left; /* 라벨은 왼쪽 정렬 */
    
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
            border-color: #5833ffff;
            outline: none;
        }
    }
`

/* =========================================
   4. 버튼 및 링크 (Action)
   ========================================= */
export const Button = styled.button`
    width: 100%;
    padding: 14px;
    
    background: #5833ffff;
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