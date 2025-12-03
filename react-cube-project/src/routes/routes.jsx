import React from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout/Layout';
import Home from "../pages/Home";
import BoardIndex from '../pages/board/BoardIndex';
import Timer from '../pages/cube/Timer';
import Algorithms from '../pages/cube/Algorithms';
import Login from '../pages/member/Login';
import NotFound from '../pages/NotFound';
import Mypage from '../pages/member/Mypage';
import Signup from '../pages/member/Signup';
import Write from '../pages/board/Write';
import Detail from '../pages/board/Detail';
import Edit from '../pages/board/Edit';

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />

                    <Route path="/board" element={<BoardIndex />} />
                    <Route path="/board/write" element={<Write />} />
                    <Route path="/board/:id" element={<Detail />} />
                    <Route path="/board/edit/:id" element={<Edit />} />

                    <Route path="/algorithms" element={<Algorithms />} />
                    <Route path="/timer" element={<Timer />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/myPage" element={<Mypage />} />
                    <Route path="/signup" element={<Signup />} />

                    <Route path="/*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )

}

export default AppRoutes