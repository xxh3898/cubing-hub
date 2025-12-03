import { Link } from "react-router-dom"
import styled from "styled-components"

export const LayoutContainer = styled.div`
    min-height: 100vh;
    width: 100%;
    background: #f3f2f2;
    display: flex;
    flex-direction: column;
`

export const HeaderContainer = styled.header`
    background: #ffffff;
    padding: 0 24px;
`

export const Nav = styled.nav`
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
`

export const Logo = styled(Link)`
    font-size: 24px;
    font-weight: 900;
    color: green;
    text-decoration: none;

    &:hover{
        color: #b3dbbcbd;
        scale: 1.02;
    }
`

export const NavLinks = styled.div`
    display: flex;
    align-items: center;
    gap: 24px;
`

export const NavLink = styled(Link)`
    color: #333;
    text-decoration: none;
    font-size: 16px;
    padding: 8px 12px;
    transition: all 0.2s;
    border-radius: 4px;
    font-weight: 600;
    
    &:hover{
        color: #5833ffff;
        background: #f0f0f0;
    }

    &.active{
        color: #5833ffff;
        background: #ffffff;
    }
`

export const MainContent = styled.main`
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
`
