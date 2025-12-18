import { useState } from 'react';
import { ALGO_DATA } from '../constants/cubeData';

const useAlgorithms = () => {
    const [activeTab, setActiveTab] = useState('F2L');

    const getImageUrl = (algo) => {
        const baseUrl = "https://visualcube.api.cubing.net/visualcube.php";
        const formulaToUse = algo.display || algo.formula;
        const encodedAlgo = encodeURIComponent(formulaToUse);

        let params = `fmt=svg&size=150&pzl=3&case=${encodedAlgo}&sch=yrbwog`;

        if (activeTab === 'OLL') params += '&stage=oll';
        if (activeTab === 'PLL') params += '&stage=pll';

        return `${baseUrl}?${params}`;
    };

    return { activeTab, setActiveTab, ALGO_DATA, getImageUrl };
};

export default useAlgorithms;