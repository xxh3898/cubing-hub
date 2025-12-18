import React, { useEffect, useState } from 'react';
import useMemberStore from '../stores/useMemberStore';
import { getMyRecords } from '../api/requests';


const useMypage = () => {
    const { user } = useMemberStore();
    const [records, setRecords] = useState([]);

    const [stats, setStats] = useState({
        total: 0,
        best: 0,
        avg: 0
    });

    const fetchMyData = async () => {
        if (!user) return;
        try {
            const recordData = await getMyRecords(user.id);
            setRecords(recordData);

            const sorted = recordData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(sorted);

            if (sorted.length > 0) {
                const times = sorted.map(r => r.time);
                const total = sorted.length;
                const best = Math.min(...times);
                const sum = times.reduce((acc, cur) => acc + cur, 0);
                const avg = (sum / total).toFixed(3);

                setStats({ total, best, avg });
            } else {
                setStats({ total: 0, best: 0, avg: 0 });
            }
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
        }
    };

    useEffect(() => {
        fetchMyData();
    }, [user]);

    const handleDelete = async (recordId) => {
        if (window.confirm("정말 이 기록을 삭제하시겠습니까?")) {
            try {
                await deleteRecord(recordId);
                alert("삭제되었습니다.");
                fetchMyData();
            } catch (error) {
                console.error("삭제 실패:", error);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    return {
        user,
        records,
        stats,
        handleDelete
    };
};

export default useMypage;