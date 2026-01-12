import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};

// Proxy configuration - will be set by client
let proxyConfig: { host: string; port: number; auth?: string } | null = null;

const server = http.createServer((req, res) => {
    // Handle proxy configuration endpoint
    if (req.url === '/api/configure' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                let host = String(data.host).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
                // Remove protocol if present
                host = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

                proxyConfig = {
                    host: host,
                    port: parseInt(data.port) || 80,
                    auth: data.auth
                };
                console.log(`🔧 Proxy configured for: ${proxyConfig.host}:${proxyConfig.port}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Handle API proxy requests
    if (req.url?.startsWith('/api/proxy/')) {
        if (!proxyConfig) {
            console.warn('⚠️ Proxy request received but proxy not configured');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy not configured' }));
            return;
        }

        const targetPath = req.url.replace('/api/proxy', '');
        console.log(`📡 Proxying ${req.method} ${targetPath} to ${proxyConfig.host}:${proxyConfig.port}`);

        // Sanitize headers - only forward what's needed
        const allowedHeaders = ['authorization', 'content-type', 'content-length', 'accept'];
        const forwardedHeaders: http.OutgoingHttpHeaders = {
            host: `${proxyConfig.host}:${proxyConfig.port}`,
            connection: 'close', // Use non-keep-alive for simplicity with ESPHome
        };

        for (const header of allowedHeaders) {
            if (req.headers[header]) {
                forwardedHeaders[header] = req.headers[header];
            }
        }

        const options = {
            hostname: proxyConfig.host,
            port: proxyConfig.port,
            path: targetPath,
            method: req.method,
            headers: forwardedHeaders,
            timeout: 10000, // 10s timeout
        };

        const proxyReq = http.request(options, (proxyRes) => {
            console.log(`✅ Target response: ${proxyRes.statusCode} for ${targetPath}`);
            res.writeHead(proxyRes.statusCode || 200, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (error: any) => {
            const errorMsg = error.message || 'Unknown proxy error';
            const errorCode = error.code || 'UNKNOWN';
            console.error(`❌ Proxy error for ${targetPath}:`, errorMsg, errorCode);

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: errorMsg,
                code: errorCode,
                target: `${proxyConfig?.host}:${proxyConfig?.port}${targetPath}`,
                timestamp: new Date().toISOString()
            }));
        });

        proxyReq.on('timeout', () => {
            console.error(`⏱️ Proxy timeout for ${targetPath}`);
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy timeout' }));
        });

        req.pipe(proxyReq);
        return;
    }

    // Default to index.html
    const filePath = req.url === '/' ? '/index.html' : (req.url || '/index.html');

    // Serve from public directory or dist for compiled JS modules
    let fullPath;
    if (filePath.startsWith('/dist/')) {
        fullPath = path.join(__dirname, '..', filePath);
    } else {
        fullPath = path.join(__dirname, '..', 'public', filePath);
    }

    const ext = path.extname(filePath);
    const contentType = (MIME_TYPES as Record<string, string>)[ext] || 'text/plain';

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Pool Automation Dashboard server running at http://localhost:${PORT}/`);
    console.log(`📡 Configure your ESPHome device IP in the web interface`);
});
