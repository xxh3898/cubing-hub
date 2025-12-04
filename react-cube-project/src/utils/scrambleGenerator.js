export const generateScramble = () => {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const length = 20;

    let scramble = [];
    let lastFace = '';

    while (scramble.length < length) {
        const face = faces[Math.floor(Math.random() * faces.length)];
        if (face === lastFace) continue;

        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        scramble.push(face + modifier);
        lastFace = face;
    }

    return scramble.join(' ');
};