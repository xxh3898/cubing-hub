import React from 'react'
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    const goHome = () => {
        alert("홈으로 이동합니다!");
        navigate("/"); // 홈 경로로 강제 이동
    }
    return (
        <>
            <div>페이지를 찾을 수 없습니다.</div>
            <button onClick={goHome}>홈으로 가기</button>
        </>
    )
}

export default NotFound