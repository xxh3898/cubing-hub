import React from 'react'
import { create } from 'zustand';

const STORAGE_KEY = "cube_app_data";
const USER_KEY = "cube_user_session";

const useMemberStore = create((set, get) => ({
    members: [],
    user: null,

    initialize: () => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            set({ members: parsed.members || [] });
        }
    },

    signup: (newMember) => {
        const { members } = get();
        if (members.find((m) => m.id === newMember.id)) {
            return false;
        }
        const updateMembers = [...members, { ...newMember, records: [] }];

        set({ members: updateMembers });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ members: updateMembers }));
        return true;
    },
}));

export default useMemberStore;