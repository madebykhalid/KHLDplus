import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import streamHandler from './api/stream.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Backend CORS-bypass & HLS .ts chunk proxy endpoints
  app.all('/api/stream', (req, res) => {
    void streamHandler(req, res);
  });

  app.all('/api/stream-extractor', (req, res) => {
    void streamHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KHLD+ server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
