import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../api/requests';

const useSignup = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        id: '',
        password: '',
        passwordConfirm: '',
        name: '',
        age: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
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

    return { formData, handleChange, handleSubmit };
};

export default useSignup;