const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === '/api/trend') {
    const samplePath = path.join(PUBLIC_DIR, 'trend-sample.json');
    const payload = fs.existsSync(samplePath) ? fs.readFileSync(samplePath, 'utf8') : '[]';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(payload);
    return;
  }

  serveStatic(req, res);
});

function serveStatic(req, res) {
  const safePath = req.url.split('?')[0];
  const filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      return serveFile(path.join(filePath, 'index.html'), res);
    }

    serveFile(filePath, res);
  });
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`Workout app running on http://localhost:${PORT}`);
});
