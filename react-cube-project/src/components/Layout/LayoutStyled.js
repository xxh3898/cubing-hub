import { Link } from "react-router-dom";
import styled from "styled-components";

// =========================================
// Main Layout Structure
// =========================================

export const LayoutContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  background: #f3f2f2;
  display: flex;
  flex-direction: column;
`;

export const MainContent = styled.main`
  max-width: 1600px;
  width: 95%;
  margin: 0 auto;
  padding: 24px 0;
  flex: 1;
`;

// =========================================
// Header & Navigation Container
// =========================================

export const HeaderContainer = styled.header`
  background: #ffffff;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

export const Nav = styled.nav`
  max-width: 1600px;
  width: 95%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
`;

export const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

// =========================================
// Interactive Elements (Links)
// =========================================

export const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 900;
  color: green;
  text-decoration: none;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: #b3dbbc;
    transform: scale(1.05);
  }
`;

export const NavLink = styled(Link)`
  color: #333;
  text-decoration: none;
  font-size: 16px;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    color: #5833ff;
    background: #f0f0f0;
  }

  &.active {
    color: #5833ff;
    background: #ffffff;
  }
`;