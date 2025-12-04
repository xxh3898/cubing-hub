import { create } from 'zustand';
import { generateScramble } from '../utils/scrambleGenerator';

const useTimerStore = create((set) => ({
    scramble: '',

    updateScramble: () => {
        set({ scramble: generateScramble() });
    }
}));

export default useTimerStore;