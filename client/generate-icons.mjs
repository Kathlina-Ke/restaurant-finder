// Run with: node generate-icons.mjs
// Requires: npm install sharp (temporary, can remove after)
//
// Or use https://realfavicongenerator.net — upload public/icons/icon.svg
// and place the output files in public/icons/

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

const svg = readFileSync('./public/icons/icon.svg');

mkdirSync('./public/icons', { recursive: true });

await sharp(svg).resize(192, 192).png().toFile('./public/icons/icon-192.png');
console.log('✅ icon-192.png');

await sharp(svg).resize(512, 512).png().toFile('./public/icons/icon-512.png');
console.log('✅ icon-512.png');

await sharp(svg).resize(180, 180).png().toFile('./public/icons/apple-touch-icon.png');
console.log('✅ apple-touch-icon.png');

console.log('Done! You can now delete generate-icons.mjs and uninstall sharp.');
