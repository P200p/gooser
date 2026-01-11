// scripts/copy-to-android.js
// Cross-platform Node script to copy the web build output (vite's dist/) into the Android assets folder

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    items.forEach((it) => copyRecursive(path.join(src, it), path.join(dest, it)));
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const androidWww = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'www');

if (!fs.existsSync(distDir)) {
  console.error('Error: build output not found. Run `npm run build` first. Expected:', distDir);
  process.exit(1);
}

console.log('Copying', distDir, '→', androidWww);
copyRecursive(distDir, androidWww);
console.log('Copy complete.');

