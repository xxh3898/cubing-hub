import React from 'react'
import { Button, Container, InputGroup, LinkText, Title } from './MemberStyled';
import useLogin from '../../hooks/useLogin';

const Login = () => {
  const { input, handleChange, handleLogin } = useLogin();


  return (
    <Container>
      <Title>로그인</Title>
      <form onSubmit={handleLogin}>
        <InputGroup>
          <label>아이디</label>
          <input name="id" value={input.id} onChange={handleChange} placeholder='아이디를 입력하세요' />
        </InputGroup>
        <InputGroup>
          <label>비밀번호</label>
          <input type="password" name="pw" value={input.pw} onChange={handleChange} placeholder="비밀번호를 입력하세요" />
        </InputGroup>
        <Button type='submit'>로그인</Button>
      </form>
      <LinkText to="/signup">아직 계정이 없으신가요? 회원가입</LinkText>
    </Container>
  )
}

export default Login;