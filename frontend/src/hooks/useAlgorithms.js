import { useState } from 'react';

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

    const algoData = {
        F2L: [
            { id: 1, name: "기본형 1 (Insert)", formula: "R U R'" },
            { id: 2, name: "기본형 2 (Left Insert)", formula: "L' U' L" },
            { id: 3, name: "분리형 (Split)", formula: "R U R' U' R U R'" },
            { id: 4, name: "붙어있는 경우 1", formula: "R U2 R' U' R U R'" },
            { id: 5, name: "붙어있는 경우 2", formula: "U' R U2 R' U2 R U' R'" },
            { id: 6, name: "밑에 박힌 경우", formula: "R U' R' U R U2 R'" },
        ],
        OLL: [
            { id: 1, name: "Sune (물고기)", formula: "R U R' U R U2 R'" },
            { id: 2, name: "Anti-Sune", formula: "R' U' R U' R' U2 R" },
            { id: 3, name: "H-Shape", formula: "R U R' U R U' R' U R U2 R'" },
            { id: 4, name: "Pi-Shape", formula: "R U2 R2 U' R2 U' R2 U2 R" },
            { id: 5, name: "Headlights", formula: "R2 D' R U2 R' D R U2 R" },
            { id: 6, name: "T-Shape", formula: "r U R' U' r' F R F'" },
            { id: 7, name: "Bowtie", formula: "F' r U R' U' r' F R" },
        ],
        PLL: [
            { id: 1, name: "Ua Perm", formula: "M2 U M U2 M' U M2" },
            { id: 2, name: "Ub Perm", formula: "M2 U' M U2 M' U' M2" },
            { id: 3, name: "Z Perm", formula: "M' U M2 U M2 U M' U2 M2" },
            { id: 4, name: "H Perm", formula: "M2 U M2 U2 M2 U M2" },
            { id: 5, name: "Aa Perm", formula: "x L2 D2 L' U' L D2 L' U L'", display: "R' F R' B2 R F' R' B2 R2" },
            { id: 6, name: "Ab Perm", formula: "x' L2 D2 L U L' D2 L U' L", display: "R2 B2 R F R' B2 R F' R" },
            { id: 7, name: "E Perm", formula: "x' R U' R' D R U R' D' R U R' D R U' R' D'", display: "R2 U R' U' y R U R' U' R U R' U' R U R' y' R U' R2" },
            { id: 8, name: "T Perm", formula: "R U R' U' R' F R2 U' R' U' R U R' F'" },
            { id: 9, name: "F Perm", formula: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
            { id: 10, name: "Ja Perm", formula: "x R2 F R F' R U2 r' U r U2", display: "L' U' L F L' U' L U L F' L2 U L" },
            { id: 11, name: "Jb Perm", formula: "R U R' F' R U R' U' R' F R2 U' R'" },
            { id: 12, name: "Ra Perm", formula: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
            { id: 13, name: "Rb Perm", formula: "R2 F R U R U' R' F' R U2 R' U2 R" },
            { id: 14, name: "Y Perm", formula: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
            { id: 15, name: "V Perm", formula: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
            { id: 16, name: "Ga Perm", formula: "R2 U R' U R' U' R U' R2 D U' R' U R D'" },
            { id: 17, name: "Gb Perm", formula: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
            { id: 18, name: "Gc Perm", formula: "R2 U' R U' R U R' U R2 D' U R U' R' D" },
            { id: 19, name: "Gd Perm", formula: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
            { id: 20, name: "Na Perm", formula: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
            { id: 21, name: "Nb Perm", formula: "R' U L' U2 R U' L R' U L' U2 R U' L" },
        ]
    };

    return { activeTab, setActiveTab, algoData, getImageUrl };
};

export default useAlgorithms;