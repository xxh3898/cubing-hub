import React from 'react'
import { create } from 'zustand';

const STORAGE_KEY = "cube_app_data";
const USER_KEY = "cube_user_session";

const useMemberStore = create((set, get) => ({
    members: [
        {
            id: "chiho3898",
            password: "0000",
            name: "조치호",
            phone: "010-1234-5678",
            age: "25",
            gender: "male",
            records: [
                { id: 1, time: 52.53, date: '2025-11-10' },
                { id: 2, time: 48.22, date: '2025-11-12' },
                { id: 3, time: 26.54, date: '2025-11-14' },
                { id: 4, time: 33.25, date: '2025-11-16' },
                { id: 5, time: 45.10, date: '2025-11-18' },
                { id: 6, time: 106.49, date: '2025-11-23' },
                { id: 7, time: 42.30, date: '2025-11-24' },
                { id: 8, time: 38.15, date: '2025-11-25' },
            ]
        },
        {
            id: "admin",
            password: "123",
            phone: "010-0000-0000",
            age: "20",
            gender: "female",
            records: []
        }
    ],

    user: {
        id: "chiho3898",
        password: "0000",
        name: "조치호",
        phone: "010-1234-5678",
        age: "25",
        gender: "male",
        records: [
            { id: 1, time: 52.53, date: '2025-11-10' },
            { id: 2, time: 48.22, date: '2025-11-12' },
            { id: 3, time: 26.54, date: '2025-11-14' },
            { id: 4, time: 33.25, date: '2025-11-16' },
            { id: 5, time: 45.10, date: '2025-11-18' },
            { id: 6, time: 106.49, date: '2025-11-23' },
            { id: 7, time: 42.30, date: '2025-11-24' },
            { id: 8, time: 38.15, date: '2025-11-25' },
        ]
    },
}));

export default useMemberStore