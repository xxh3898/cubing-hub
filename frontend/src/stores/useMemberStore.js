import { create } from 'zustand';

const USER_KEY = "cube_user_session";

const useMemberStore = create((set) => ({
    user: null,

    initialize: () => {
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedUser) {
            set({ user: JSON.parse(savedUser) });
        }
    },

    setUser: (userData) => {
        set({ user: userData });
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
    },

    logout: () => {
        set({ user: null });
        localStorage.removeItem(USER_KEY);
    }
}));

export default useMemberStore;