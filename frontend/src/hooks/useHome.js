import { useState, useEffect } from 'react';
import useMemberStore from '../stores/useMemberStore';
import { getMyRecords } from '../api/requests';

const useHome = () => {
    const { user } = useMemberStore();
    const [tip, setTip] = useState('');
    const [records, setRecords] = useState([]);

    const tips = [
        "F2L은 속도보다 '끊김 없는(Look Ahead)' 플레이가 중요합니다.",
        "OLL 공식을 외울 때는 손가락의 움직임(Finger Trick)을 기억하세요.",
        "큐브 윤활유를 바르면 기록 단축에 큰 도움이 됩니다.",
        "PLL 판단 시간을 줄이는 것이 20초 진입의 핵심입니다.",
        "Cross는 8회전 이내에 맞추도록 연습해보세요.",
    ];

    useEffect(() => {
        setTip(tips[Math.floor(Math.random() * tips.length)]);

        if (user) {
            getMyRecords(user.id)
                .then(data => setRecords(data))
                .catch(e => console.error("기록 로딩 실패", e));
        }
    }, [user]);

    const hasRecords = records.length > 0;
    const times = hasRecords ? records.map(r => r.time) : [];

    const bestRecord = hasRecords ? Math.min(...times) : 0;

    const avgRecord = hasRecords
        ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)
        : 0;

    const recentRecords = hasRecords
        ? records.slice().reverse().slice(0, 5)
        : [];

    return {
        user,
        tip,
        hasRecords,
        bestRecord,
        avgRecord,
        recentRecords
    };
};

export default useHome;