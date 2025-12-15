import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useMemberStore from '../../stores/useMemberStore';
import { login } from '../../api/requests';
import { Button, Container, InputGroup, LinkText, Title } from './MemberStyled';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useMemberStore();
  const [input, setInput] = useState({ id: '', pw: '' });

  const handleChange = (e) => {
    setInput({
      ...input,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!input.id || !input.pw) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const memberData = await login(input.id, input.pw);

      setUser(memberData);

      alert(`로그인 성공! 환영합니다, ${memberData.name}님.`);
      navigate('/');

    } catch (error) {
      console.error("로그인 실패:", error);
      alert("아이디 또는 비밀번호가 일치하지 않습니다.");
    }
  };

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