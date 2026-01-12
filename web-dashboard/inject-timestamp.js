import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate build timestamp
const buildTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});

// Read source HTML
let html = readFileSync(join(__dirname, 'public/index.html'), 'utf8');

// Replace build timestamp placeholder
html = html.replace('__BUILD_TIMESTAMP__', buildTimestamp);

// Ensure dist directory exists
try {
    mkdirSync(join(__dirname, 'dist'), { recursive: true });
} catch (err) {
    // Directory already exists
}

// Write to dist folder
writeFileSync(join(__dirname, 'dist/index.html'), html, 'utf8');

console.log(`✅ Build timestamp injected: ${buildTimestamp}`);
