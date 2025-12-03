import React from 'react'
import { LayoutContainer, MainContent } from './LayoutStyled'
import Header from './Header'
import { Outlet } from 'react-router-dom'

const Layout = () => {
    return (
        <LayoutContainer>
            <Header />
            <MainContent>
                <Outlet />
            </MainContent>
        </LayoutContainer>
    )
}

export default Layout