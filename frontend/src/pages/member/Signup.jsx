import React from 'react';
import useSignup from '../../hooks/useSignup';
import { Button, Container, InputGroup, Title } from './MemberStyled';

const Signup = () => {
  const { formData, handleChange, handleSubmit } = useSignup();

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