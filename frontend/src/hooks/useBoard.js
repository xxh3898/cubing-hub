import { useState, useEffect } from 'react';
import { getPosts } from '../api/requests';

const useBoard = () => {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await getPosts();
                setPosts(data);
            } catch (error) {
                console.error("게시글 로딩 실패:", error);
            }
        };

        fetchPosts();
    }, []);

    return { posts };
};

export default useBoard;