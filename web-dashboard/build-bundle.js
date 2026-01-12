import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { minify as minifyHTML } from 'html-minifier-terser';
import { minify as minifyJS } from 'terser';
import CleanCSS from 'clean-css';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildBundle() {
    console.log('📦 Building single-file bundle...\n');

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

    // Read source files
    let html = readFileSync(join(__dirname, 'public/index.html'), 'utf8');
    const css = readFileSync(join(__dirname, 'public/styles.css'), 'utf8');
    const appJS = readFileSync(join(__dirname, 'public/app.js'), 'utf8');

    // Read all modular API files
    const baseJS = readFileSync(join(__dirname, 'dist/api/base.js'), 'utf8');
    const poolLightJS = readFileSync(join(__dirname, 'dist/api/pool-light.js'), 'utf8');
    const temperatureJS = readFileSync(join(__dirname, 'dist/api/temperature.js'), 'utf8');
    const pumpJS = readFileSync(join(__dirname, 'dist/api/pump.js'), 'utf8');
    const chlorinatorJS = readFileSync(join(__dirname, 'dist/api/chlorinator.js'), 'utf8');
    const systemJS = readFileSync(join(__dirname, 'dist/api/system.js'), 'utf8');
    const indexJS = readFileSync(join(__dirname, 'dist/api/index.js'), 'utf8');
    const esphomeApiJS = readFileSync(join(__dirname, 'dist/esphome-api.js'), 'utf8');

    // Minify CSS
    console.log('🎨 Minifying CSS...');
    const minifiedCSS = new CleanCSS({}).minify(css).styles;

    // Minify JavaScript (combine all API modules and app JS)
    console.log('⚙️  Minifying JavaScript...');
    // Modify app JS to force useProxy: false in bundled version and remove import
    const modifiedAppJS = appJS
        .replace(/import.*from.*['"].*esphome-api\.js['"];?\s*/g, '')
        .replace(/useProxy:\s*true,?\s*\/\/[^\n]*/g, 'useProxy: false, // Bundled version - direct connection');

    // Combine all modules - remove all export/import statements
    const stripExportsImports = (code) => code
        // Remove full export statements first
        .replace(/export\s*\*\s+from\s+['"][^'"]*['"];?\s*/g, '') // export * from '...'
        .replace(/export\s*{[^}]*}\s*from\s+['"][^'"]*['"];?\s*/g, '') // export { ... } from '...'
        .replace(/export\s*{[^}]*};?\s*/g, '') // export { ... }
        // Replace export declarations
        .replace(/export\s+(class|function|const|let|var)\s+/g, '$1 ') // export class/function/etc
        .replace(/export\s+default\s+/g, '') // export default
        // Remove import statements
        .replace(/import\s*{[^}]*}\s*from\s+['"][^'"]*['"];?\s*/g, '') // import { ... } from '...'
        .replace(/import\s+\w+\s+from\s+['"][^'"]*['"];?\s*/g, '') // import X from '...'
        .replace(/import\s+['"][^'"]*['"];?\s*/g, ''); // import '...'

    const combinedJS = [
        stripExportsImports(baseJS),
        stripExportsImports(poolLightJS),
        stripExportsImports(temperatureJS),
        stripExportsImports(pumpJS),
        stripExportsImports(chlorinatorJS),
        stripExportsImports(systemJS),
        stripExportsImports(indexJS),
        stripExportsImports(esphomeApiJS),
        modifiedAppJS
    ].join('\n');

    // Debug: write combined JS to file
    writeFileSync(join(__dirname, 'build/combined.js'), combinedJS, 'utf8');
    console.log('📝 Combined JS written to build/combined.js for debugging');

    const minifiedJSResult = await minifyJS(combinedJS, {
        compress: {
            dead_code: true,
            drop_console: false,
            drop_debugger: true,
            keep_classnames: true,
            keep_fnames: true
        },
        mangle: false,
        format: {
            comments: false
        }
    });
    const minifiedJS = minifiedJSResult.code;

    // Inline CSS and JS into HTML
    console.log('📄 Inlining assets into HTML...');
    let bundledHTML = html
        .replace('__BUILD_TIMESTAMP__', buildTimestamp)
        .replace(/<link rel="stylesheet" href="styles\.css">/, `<style>${minifiedCSS}</style>`)
        .replace(/<script type="module" src="app\.js"><\/script>/, `<script>${minifiedJS}</script>`);

    // Minify HTML
    console.log('🗜️  Minifying HTML...');
    const minifiedHTML = await minifyHTML(bundledHTML, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: true,
        minifyJS: true
    });

    // Create build directory and write output
    mkdirSync(join(__dirname, 'build'), { recursive: true });
    const outputPath = join(__dirname, 'build/index.html');
    writeFileSync(outputPath, minifiedHTML, 'utf8');

    // Show file sizes
    const originalSize = (html.length + css.length + appJS.length + baseJS.length + poolLightJS.length + temperatureJS.length + pumpJS.length + chlorinatorJS.length + systemJS.length + indexJS.length + esphomeApiJS.length) / 1024;
    const bundledSize = minifiedHTML.length / 1024;
    const savings = ((1 - bundledSize / originalSize) * 100).toFixed(1);

    console.log('\n✅ Bundle created successfully!');
    console.log(`📊 Original size: ${originalSize.toFixed(1)} KB`);
    console.log(`📦 Bundled size: ${bundledSize.toFixed(1)} KB`);
    console.log(`💾 Savings: ${savings}%`);
    console.log(`📁 Output: ${outputPath}`);
}

buildBundle().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
