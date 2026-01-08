import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useMemberStore from '../stores/useMemberStore';
import { getPost, deletePost } from '../api/requests';

const usePostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useMemberStore();
    const [post, setPost] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const data = await getPost(id);
                setPost(data);
            } catch (error) {
                console.error("게시글 로딩 실패:", error);
                alert("게시글을 불러올 수 없습니다.");
                navigate('/board');
            }
        };
        fetchPost();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!post) return;

        if (!user || user.id !== post.authorId) {
            alert("삭제 권한이 없습니다.");
            return;
        }

        if (window.confirm("정말로 삭제하시겠습니까?")) {
            try {
                await deletePost(id);
                alert("삭제되었습니다.");
                navigate('/board');
            } catch (e) {
                alert("삭제 실패!");
            }
        }
    };

    const isAuthor = post && user && user.id === post.authorId;

    return { post, isAuthor, handleDelete };
};

export default usePostDetail;