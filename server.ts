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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'PublicaFix' });
});

app.get('/api/initial-script', (_req, res) => {
  const attachedPath = path.resolve(
    __dirname,
    'public/assets/aistudio/INICIAR-CORRECAO_5576a76e.cmd',
  );
  let content = ORIGINAL_ATTACHED_CMD;
  let filename = 'INICIAR-CORRECAO_5576a76e.cmd';

  try {
    if (fs.existsSync(attachedPath)) {
      content = fs.readFileSync(attachedPath, 'utf-8');
    }
  } catch {
    // Fallback to embedded attached script content
  }

  res.json({
    filename,
    content,
    audit: analyzeAndModernizeScript(filename, content),
  });
});

app.get('/api/workspace', (_req, res) => {
  res.status(503).json({
    code: 'AUTH_NOT_CONFIGURED',
    error: 'A área pessoal está temporariamente indisponível até a autenticação e o armazenamento estarem configurados.',
  });
});

app.post('/api/audit-script', (req, res) => {
  const { filename, content } = req.body ?? {};
  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: 'O conteúdo do script não pode estar vazio.' });
    return;
  }
  if (content.length > 32000) {
    res.status(400).json({ error: 'O script excede o limite de 32 KB para análise.' });
    return;
  }

  const safeFilename =
    typeof filename === 'string' && filename.trim().length > 0
      ? filename.trim().slice(0, 80)
      : 'INICIAR-CORRECAO.cmd';

  const audit = analyzeAndModernizeScript(safeFilename, content);
  res.json({ audit });
});

app.post('/api/releases', (_req, res) => {
  res.status(503).json({
    code: 'LOCAL_RUNNER_NOT_CONFIGURED',
    error: 'A execução de scripts está desativada. O PublicaFix não executa ficheiros enviados pelos clientes no servidor.',
  });
});

app.post('/api/releases/:id/rollback', (_req, res) => {
  res.status(503).json({
    code: 'LOCAL_RUNNER_NOT_CONFIGURED',
    error: 'A reversão remota está desativada até existir um agente local autenticado e seguro.',
  });
});

app.post('/api/subscriptions', (_req, res) => {
  res.status(503).json({
    code: 'BILLING_NOT_CONFIGURED',
    error: 'O checkout real ainda não está configurado. Não foi cobrado qualquer valor.',
  });
});

app.post('/api/subscriptions/toggle-renew', (_req, res) => {
  res.status(503).json({
    code: 'BILLING_NOT_CONFIGURED',
    error: 'A gestão de renovações só estará disponível depois da integração Stripe.',
  });
});

app.put('/api/settings', (_req, res) => {
  res.status(503).json({
    code: 'AUTH_NOT_CONFIGURED',
    error: 'As definições da equipa estarão disponíveis depois da autenticação e do armazenamento estarem configurados.',
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
    console.log(`PublicaFix server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
