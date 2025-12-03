import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom';
import { HeaderContainer, Logo, Nav, NavLinks, NavLink } from './LayoutStyled';

const Header = () => {
    const location = useLocation();

    useEffect(() => {
        console.log(location.pathname);
    })

    return (
        <HeaderContainer>
            <Nav>
                <Logo to="/">CUBE</Logo>
                <NavLinks>
                    <NavLink to="/" style={{ marginRight: '15px' }}>홈</NavLink>
                    <NavLink to="/board">게시판</NavLink>
                    <NavLink to="/algorithms">공식</NavLink>
                    <NavLink to="/timer">타이머</NavLink>
                    <NavLink to="/login">로그인</NavLink>
                </NavLinks>
            </Nav>
        </HeaderContainer>
    )
}

export default Header