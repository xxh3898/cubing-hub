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

        const savedUser = localStorage.getItem(USER_KEY);
        if (savedUser) {
            set({ user: JSON.parse(savedUser) });
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

    login: (id, password) => {
        const { members } = get();
        const foundUser = members.find((m) => m.id === id && m.password === password);

        if (foundUser) {
            set({ user: foundUser });
            localStorage.setItem(USER_KEY, JSON.stringify(foundUser));
            return true;
        }
        return false;
    },

    logout: () => {
        set({ user: null });
        localStorage.removeItem(USER_KEY);
    },

    addRecord: (newRecord) => {
        const { user, members } = get();
        if (!user) return;

        const updatedUser = {
            ...user,
            records: [...user.records, newRecord]
        };
        set({ user: updatedUser });
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

        const updatedMembers = members.map(m =>
            m.id === user.id ? updatedUser : m
        );
        set({ members: updatedMembers });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMembers));
    },

    removeRecord: (recordId) => {
        const { user, members } = get();
        if (!user) return;

        const updatedRecords = user.records.filter(r => r.id !== recordId);
        const updatedUser = { ...user, records: updatedRecords };

        set({ user: updatedUser });
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

        const updatedMembers = members.map(m =>
            m.id === user.id ? updatedUser : m
        );
        set({ members: updatedMembers });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMembers));
    }
}));

export default useMemberStore;