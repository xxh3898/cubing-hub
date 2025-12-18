import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMemberStore from '../stores/useMemberStore';
import { getPost, writePost, updatePost } from '../api/requests';

const usePostForm = (postId = null) => {
    const navigate = useNavigate();
    const { user } = useMemberStore();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (postId) {
            const fetchPost = async () => {
                try {
                    const data = await getPost(postId);
                    if (!user || user.id !== data.authorId) {
                        alert("수정 권한이 없습니다.");
                        navigate('/board');
                        return;
                    }
                    setTitle(data.title);
                    setContent(data.content);
                } catch (e) {
                    alert("게시글 정보를 가져오지 못했습니다.");
                    navigate('/board');
                }
            };
            fetchPost();
        }
    }, [postId, user, navigate]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            navigate('/login');
            return;
        }

        try {
            if (postId) {
                await updatePost(postId, { title, content }, user.id);
                alert("수정되었습니다.");
                navigate(`/board/${postId}`);
            } else {
                await writePost({ title, content }, user.id);
                alert("게시글이 등록되었습니다.");
                navigate('/board');
            }
        } catch (error) {
            console.error(error);
            alert("작업 중 오류가 발생했습니다.");
        }
    };

    return { title, setTitle, content, setContent, handleSubmit };
};

export default usePostForm;