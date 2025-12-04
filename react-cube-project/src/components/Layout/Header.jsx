import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { HeaderContainer, Logo, Nav, NavLinks, NavLink } from './LayoutStyled';
import useMemberStore from '../../stores/useMemberStore';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { user, logout } = useMemberStore();

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    }

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        alert("로그아웃 되었습니다.");
        navigate('/');
    }

    return (
        <HeaderContainer>
            <Nav>
                <Logo to="/">CUBE</Logo>
                <NavLinks>
                    <NavLink to="/" className={isActive('/')}>홈</NavLink>
                    <NavLink to="/board" className={isActive('/board')}>게시판</NavLink>
                    <NavLink to="/algorithms" className={isActive('/algorithms')}>공식</NavLink>
                    <NavLink to="/timer" className={isActive('/timer')}>타이머</NavLink>
                    {user ? (
                        <NavLink to="#" onClick={handleLogout}>
                            로그아웃
                        </NavLink>
                    ) : (
                        <NavLink to="/login" className={isActive('/login')}>
                            로그인
                        </NavLink>
                    )}
                </NavLinks>
            </Nav>
        </HeaderContainer>
    )
}

export default Header