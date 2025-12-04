import styled from "styled-components";

// =========================================
// Layout & Typography
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
  border-left: 5px solid #5833ff; /* 포인트 컬러 */
  padding-left: 15px;
`;

// =========================================
// Table Styles (게시판 목록)
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
      transition: color 0.2s;

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
      transition: color 0.2s;

      &:hover {
        text-decoration: underline;
        color: #666;
      }
    }
  }
`;

// =========================================
// Form Styles (글쓰기/수정)
// =========================================

export const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Input = styled.input`
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s;

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
  transition: border-color 0.2s;

  &:focus {
    border-color: #5833ff;
    outline: none;
  }
`;

// =========================================
// Button Styles
// =========================================

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

export const Button = styled.button`
  padding: 10px 20px;
  background: #5833ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #4622e0;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;