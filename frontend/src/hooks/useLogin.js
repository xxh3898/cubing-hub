import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useMemberStore from '../stores/useMemberStore';
import { login } from '../api/requests';

const useLogin = () => {
    const navigate = useNavigate();
    const { setUser } = useMemberStore();
    const [input, setInput] = useState({ id: '', pw: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInput((prev) => ({
            ...prev,
            [name]: value
        }));
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

            alert(`로그인 성공! 환영합니다, ${memberData.user_name}님.`);
            navigate('/');

        } catch (error) {
            console.error("로그인 실패:", error);
            alert("아이디 또는 비밀번호가 일치하지 않습니다.");
        }
    };

    return { input, handleChange, handleLogin };
};

export default useLogin;