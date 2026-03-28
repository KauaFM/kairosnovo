import fs from 'fs';
import path from 'path';

const filesToInvert = [
    './components/Navigation.jsx',
    './components/Dossier.jsx',
    './components/RankSystem.jsx',
    './components/Nexus.jsx',
    './App.jsx'
];

let globalReplaces = [
    { from: /bg-\[#050507\]/g, to: 'bg-[#ffffff]' },
    { from: /bg-\[#020203\]/g, to: 'bg-[#f5f5f7]' },
    { from: /bg-\[#08080a\]/g, to: 'bg-[#eeeeee]' },
    { from: /bg-\[#000000\]/g, to: 'bg-[#ffffff]' },
    { from: /from-\[#000000\]/g, to: 'from-[#ffffff]' },
    { from: /via-\[#000000\]/g, to: 'via-[#ffffff]' },
    { from: /bg-white/g, to: 'bg-[COLOR_SWAP_1]' },
    { from: /bg-black/g, to: 'bg-white' },
    { from: /bg-\[COLOR_SWAP_1\]/g, to: 'bg-black' },

    { from: /text-white/g, to: 'text-[COLOR_SWAP_2]' },
    { from: /text-black/g, to: 'text-white' },
    { from: /text-\[COLOR_SWAP_2\]/g, to: 'text-black' },

    { from: /border-white/g, to: 'border-[COLOR_SWAP_3]' },
    { from: /border-black/g, to: 'border-white' },
    { from: /border-\[COLOR_SWAP_3\]/g, to: 'border-black' },

    { from: /from-white/g, to: 'from-[COLOR_SWAP_4]' },
    { from: /from-black/g, to: 'from-white' },
    { from: /from-\[COLOR_SWAP_4\]/g, to: 'from-black' },

    { from: /via-white/g, to: 'via-[COLOR_SWAP_5]' },
    { from: /via-black/g, to: 'via-white' },
    { from: /via-\[COLOR_SWAP_5\]/g, to: 'via-black' },

    { from: /stroke="#ffffff"/g, to: 'stroke="#000000"' },
    { from: /fill="#ffffff"/g, to: 'fill="#000000"' },
    { from: /stroke="white"/g, to: 'stroke="black"' },
    { from: /fill="white"/g, to: 'fill="black"' },

    { from: /rgba\(255,255,255,/g, to: 'rgba(0,0,0,' }
];

filesToInvert.forEach(file => {
    try {
        let filePath = path.resolve(file);
        if (fs.existsSync(filePath)) {
            console.log('Found ' + file);
            let content = fs.readFileSync(filePath, 'utf-8');
            let initialLength = content.length;

            globalReplaces.forEach(replacement => {
                content = content.replace(replacement.from, replacement.to);
            });

            fs.writeFileSync(filePath, content);
            console.log('Modified ' + file + ' | diff length: ' + (content.length - initialLength));
        } else {
            console.log('MIA ' + file);
        }
    } catch (e) {
        console.error(e);
    }
});
