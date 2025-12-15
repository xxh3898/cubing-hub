import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signup } from '../../api/requests';
import { Button, Container, InputGroup, Title } from './MemberStyled';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '',
    password: '',
    passwordConfirm: '',
    name: '',
    age: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    if (!formData.id || !formData.password || !formData.passwordConfirm || !formData.name) {
      alert("모든 정보를 입력해주세요!");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const { passwordConfirm, ...newMember } = formData;

    try {
      await signup(newMember);
      alert("회원가입 성공! 로그인 해주세요.");
      navigate('/login');
    } catch (error) {
      console.error("가입 실패:", error);
      if (error.response && error.response.data) {
        alert(error.response.data);
      } else {
        alert("회원가입 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <Container>
      <Title>회원가입</Title>
      <InputGroup>
        <label>아이디</label>
        <input name="id" value={formData.id} onChange={handleChange} placeholder="아이디" />
      </InputGroup>
      <InputGroup>
        <label>비밀번호</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="비밀번호" />
      </InputGroup>
      <InputGroup>
        <label>비밀번호 확인</label>
        <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} placeholder="비밀번호 확인" />
      </InputGroup>
      <InputGroup>
        <label>이름</label>
        <input name="name" value={formData.name} onChange={handleChange} placeholder="실명" />
      </InputGroup>
      <div style={{ display: 'flex', gap: '10px' }}>
        <InputGroup style={{ flex: 1 }}>
          <label>나이</label>
          <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="나이" />
        </InputGroup>
      </div>
      <Button onClick={handleSubmit}>가입하기</Button>
    </Container>
  )
}

export default Signup;