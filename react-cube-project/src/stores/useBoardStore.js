import { create } from "zustand";

const BOARD_KEY = "cube_board_data";

const useBoardStore = create((set, get) => ({
    posts: [],

    initializeBoard: () => {
        const saved = localStorage.getItem(BOARD_KEY);
        if (saved) {
            set({ posts: JSON.parse(saved) });
        } else {
            // (더미 데이터
            set({
                posts: [
                    { id: 1, title: "큐브 20초대 진입 팁!", content: "F2L 연습이 중요합니다. 천천히 돌리면서 다음 조각을 보세요(Look Ahead).", author: "홍길동", date: "2025-12-03" },
                    { id: 2, title: "가입 인사 드립니다", content: "잘 부탁드려요~ 열심히 활동하겠습니다!", author: "김큐브", date: "2025-12-02" },
                    { id: 3, title: "오늘의 스크램블 공유", content: "R U R' U' ... 이 공식 써보세요 기록 잘 나옵니다.", author: "조치호", date: "2025-12-01" }
                ]
            })
        }
    },

    addPost: (title, content, author, authorId) => {
        const { posts } = get();
        const newPost = {
            id: Date.now(),
            title,
            content,
            author,
            authorId: authorId,
            date: new Date().toISOString().split('T')[0],
        };
        const updated = [newPost, ...posts];
        set({ posts: updated });
        localStorage.setItem(BOARD_KEY, JSON.stringify(updated));
    },

    deletePost: (id) => {
        const { posts } = get();
        const updated = posts.filter(post => post.id !== Number(id));
        set({ posts: updated });
        localStorage.setItem(BOARD_KEY, JSON.stringify(updated));
    },

    updatePost: (id, newTitle, newContent) => {
        const { posts } = get();
        const updated = posts.map(post =>
            post.id === Number(id) ? { ...post, title: newTitle, content: newContent } : post
        );
        set({ posts: updated });
        localStorage.setItem(BOARD_KEY, JSON.stringify(updated));
    }
}));

export default useBoardStore;