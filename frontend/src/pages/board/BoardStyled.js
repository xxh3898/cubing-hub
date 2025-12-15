import styled from "styled-components";

// =========================================
// 1. 공통 레이아웃 & 타이포그래피
// =========================================

export const BoardContainer = styled.div`
  width: 100%;
  margin: 0 auto;
  padding: 40px 0;
`;

export const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 30px;
  border-left: 5px solid #5833ff;
  padding-left: 15px;
`;

// =========================================
// 2. 게시판 목록 (Table) 스타일
// =========================================

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;

  th, td {
    padding: 15px;
    text-align: center;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f8f9fa;
    color: #333;
    font-weight: 600;
    border-top: 2px solid #333;
  }

  td.title {
    text-align: left;
    font-weight: bold;
    a {
      color: #333;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
        color: #5833ff;
      }
    }
  }

  td.content-preview {
    text-align: left;
    a {
      color: #888;
      text-decoration: none;
      font-size: 14px;
      &:hover {
        text-decoration: underline;
        color: #666;
      }
    }
  }
`;

// =========================================
// 3. 글쓰기 폼 (Form) 스타일
// =========================================

export const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const InputGroup = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 700;
    color: #333;
    font-size: 16px;
  }

  input {
    padding: 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    &:focus {
      border-color: #5833ff;
      outline: none;
    }
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  &:focus {
    border-color: #5833ff;
    outline: none;
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  height: 400px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  &:focus {
    border-color: #5833ff;
    outline: none;
  }
`;

// =========================================
// 4. 상세 페이지 (Detail) 전용 스타일
// =========================================

export const PostWrapper = styled.div`
  border-top: 2px solid #333;
  border-bottom: 1px solid #ddd;
`;

export const PostHeader = styled.div`
  padding: 20px 15px;
  border-bottom: 1px solid #eee;
  background-color: #fcfcfc;
`;

export const PostTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0 0 15px 0;
`;

export const PostInfo = styled.div`
  display: flex;
  gap: 20px;
  color: #666;
  font-size: 14px;

  span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  strong {
    font-weight: 600;
    color: #333;
  }
`;

export const PostContent = styled.div`
  padding: 40px 20px;
  min-height: 300px;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
`;

// =========================================
// 5. 버튼 (Buttons)
// =========================================

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

export const Button = styled.button`
  padding: 10px 20px;
  background: #5833ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s;

  &:hover {
    background: #4622e0;
  }
`;

export const SecondaryButton = styled(Button)`
  background: #fff;
  color: #555;
  border: 1px solid #ddd;

  &:hover {
    background: #f1f1f1;
    color: #333;
  }
`;