import React from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ROUTES } from './routePaths'
import HOME from "../pages/Home";
import NotFound from '../pages/NotFound'
import Timer from '../pages/cube/timer';
import Algorithms from '../pages/cube/Algorithms';
import BoardIndex from '../pages/board/BoardIndex';
import Detail from '../pages/board/Detail';
import Edit from '../pages/board/Edit';
import Write from '../pages/board/Write';
import Login from '../pages/member/Login';
import Signup from '../pages/member/Signup';
import Mypage from '../pages/member/Mypage';

const AppRoutes = () => {
    return (
        <>
            <BrowserRouter>
                <nav>
                    <Link to="/">홈</Link>
                    <Link to="/board">게시판</Link>
                    <Link to="/mypage">프로필</Link>
                </nav>
                <Routes>
                    <Route path='/' element={<HOME />} />
                    <Route path='/*' element={<NotFound />} />

                    <Route path='/timer' element={<Timer />} />
                    <Route path='/algorithms' element={<Algorithms />} />

                    <Route path='/board' element={<BoardIndex />} />
                    <Route path='/board/:id' element={<Detail />} />
                    <Route path='/board/write' element={<Write />} />
                    <Route path='/board/edit/:id' element={<Edit />} />

                    <Route path='/login' element={<Login />} />
                    <Route path='/signup' element={<Signup />} />
                    <Route path='/mypage' element={<Mypage />} />
                </Routes>
            </BrowserRouter>
        </>
    )

}

export default AppRoutes