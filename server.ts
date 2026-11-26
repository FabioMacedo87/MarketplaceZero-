import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ORIGINAL_ATTACHED_CMD, analyzeAndModernizeScript } from './src/utils/scriptAudit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'PublicaFix', mode: 'static-audit-beta' });
});

app.get('/api/initial-script', (_req, res) => {
  const attachedPath = path.resolve(__dirname, 'public/assets/aistudio/INICIAR-CORRECAO_5576a76e.cmd');
  let content = ORIGINAL_ATTACHED_CMD;
  let filename = 'INICIAR-CORRECAO.cmd';
  try {
    if (fs.existsSync(attachedPath)) content = fs.readFileSync(attachedPath, 'utf-8');
  } catch {
    // Keep the embedded sample if the file is unavailable.
  }
  res.json({ filename, content, stored: false, executed: false });
});

app.post('/api/audit-script', (req, res) => {
  const body = req.body ?? {};
  const { filename, content } = body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: 'O conteúdo do script não pode estar vazio.' });
    return;
  }
  if (Buffer.byteLength(content, 'utf8') > 32 * 1024) {
    res.status(413).json({ error: 'O script excede o limite de 32 KB para análise.' });
    return;
  }

  const requestedName = typeof filename === 'string' ? filename : 'script.cmd';
  const safeFilename = requestedName.replace(/^.*[\\/]/, '').replace(/[^\w.-]/g, '_').slice(0, 80);
  if (!/\.(cmd|bat|ps1)$/i.test(safeFilename)) {
    res.status(400).json({ error: 'Formato não suportado. Use .cmd, .bat ou .ps1.' });
    return;
  }

  const audit = analyzeAndModernizeScript(safeFilename, content);
  res.json({ audit, engine: 'publicafix-static-rules-v1', stored: false, executed: false });
});

// These features remain unavailable until their required architecture exists.
app.all(['/api/workspace', '/api/settings'], (_req, res) => {
  res.status(503).json({
    code: 'AUTH_NOT_CONFIGURED',
    error: 'Esta funcionalidade ainda não está disponível no beta. Não são guardados dados de conta.',
  });
});
app.all(['/api/releases', '/api/releases/:id/rollback'], (_req, res) => {
  res.status(503).json({
    code: 'EXECUTION_NOT_AVAILABLE',
    error: 'O PublicaFix não executa nem reverte scripts nesta versão.',
  });
});
app.all(['/api/subscriptions', '/api/subscriptions/toggle-renew'], (_req, res) => {
  res.status(503).json({
    code: 'BILLING_NOT_CONFIGURED',
    error: 'As subscrições ainda não estão disponíveis. Não foi cobrado qualquer valor.',
  });
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const runningViaTsx =
    process.env.npm_lifecycle_event === 'dev' ||
    process.execArgv.some((arg) => arg.includes('tsx'));
  const useStaticProd =
    process.env.NODE_ENV === 'production' || (!runningViaTsx && fs.existsSync(distPath));

  if (!useStaticProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('PublicaFix server listening on http://0.0.0.0:' + PORT);
  });
}

startServer();
