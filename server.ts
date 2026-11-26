import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_INVOICES,
  INITIAL_RELEASES,
  INITIAL_SUBSCRIPTION,
  INITIAL_TEAM_SETTINGS,
  PLANS,
  getPlanPrice,
} from './src/data/plans.ts';
import {
  BillingCycle,
  CurrencyCode,
  PlanId,
  ReleaseStatus,
  type InvoiceRecord,
  type ReleaseRecord,
  type SubscriptionState,
  type TeamSettings,
} from './src/types.ts';
import { ORIGINAL_ATTACHED_CMD, analyzeAndModernizeScript } from './src/utils/scriptAudit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '64kb' }));

// In-memory store initialized cleanly with domain fixtures
let subscriptionState: SubscriptionState = { ...INITIAL_SUBSCRIPTION };
let invoicesStore: InvoiceRecord[] = [...INITIAL_INVOICES];
let releasesStore: ReleaseRecord[] = [...INITIAL_RELEASES];
let teamSettingsStore: TeamSettings = { ...INITIAL_TEAM_SETTINGS };

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
  res.json({
    subscription: subscriptionState,
    invoices: invoicesStore,
    releases: releasesStore,
    settings: teamSettingsStore,
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

app.post('/api/releases', (req, res) => {
  const { title, scriptName, environment, simulateFailure } = req.body ?? {};

  if (!subscriptionState.active) {
    res.status(403).json({
      error: 'Subscrição inativa. Ative a mensalidade para executar novas publicações.',
    });
    return;
  }

  const activePlan = PLANS.find((p) => p.id === subscriptionState.planId) ?? PLANS[1];
  if (
    activePlan.monthlyQuota !== null &&
    subscriptionState.usedQuotaThisMonth >= activePlan.monthlyQuota
  ) {
    res.status(403).json({
      error: `Limite mensal de ${activePlan.monthlyQuota} publicações atingido. Atualize o seu plano.`,
    });
    return;
  }

  const cleanTitle =
    typeof title === 'string' && title.trim().length >= 3
      ? title.trim().slice(0, 100)
      : 'Correção Operacional';
  const cleanScript =
    typeof scriptName === 'string' && scriptName.trim().length > 0
      ? scriptName.trim().slice(0, 80)
      : 'INICIAR-CORRECAO_5576a76e.cmd';
  const validEnvs = ['Produção', 'Pré-Produção', 'Homologação'] as const;
  const cleanEnv = validEnvs.includes(environment) ? environment : 'Pré-Produção';

  const shouldFail = Boolean(simulateFailure);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateStr = `${now.toISOString().slice(0, 10)} ${hh}:${mm}`;
  const checksum = Math.random().toString(16).slice(2, 14).padEnd(12, 'a');

  const newRelease: ReleaseRecord = shouldFail
    ? {
        id: `rel-${Date.now().toString().slice(-4)}`,
        title: cleanTitle,
        scriptName: cleanScript,
        environment: cleanEnv,
        operator: subscriptionState.workspaceName,
        createdAt: dateStr,
        durationSec: 8.6,
        status: teamSettingsStore.autoRollbackOnFailure
          ? ReleaseStatus.REVERTIDA
          : ReleaseStatus.FALHADA,
        exitCode: 1,
        checksum,
        steps: [
          {
            name: 'Preflight & Assinatura',
            status: 'Concluída',
            durationMs: 1420,
            detail: `SHA-256 ${checksum} verificado`,
          },
          {
            name: 'Snapshot de Estado',
            status: 'Concluída',
            durationMs: 2680,
            detail: 'Ponto de restauro gravado',
          },
          {
            name: 'Execução PowerShell',
            status: 'Falhada',
            durationMs: 3100,
            detail: 'Código de saída 1 em verificação de dependência',
          },
          {
            name: teamSettingsStore.autoRollbackOnFailure
              ? 'Reversão Automática'
              : 'Verificação Pós-Deploy',
            status: teamSettingsStore.autoRollbackOnFailure ? 'Concluída' : 'Falhada',
            durationMs: 1400,
            detail: teamSettingsStore.autoRollbackOnFailure
              ? 'Snapshot anterior restaurado sem impacto'
              : 'Reversão automática desativada nas definições',
          },
        ],
        logs: [
          `[${hh}:${mm}:${ss}] [PublicaFix] A iniciar "${cleanTitle}" (${cleanEnv})`,
          `[${hh}:${mm}:${ss}] [Preflight] Script ${cleanScript} validado`,
          `[${hh}:${mm}:${ss}] [ERRO] Falha simulada na etapa de aplicação (ExitCode 1)`,
          teamSettingsStore.autoRollbackOnFailure
            ? `[${hh}:${mm}:${ss}] [Reversao] Snapshot restaurado automaticamente.`
            : `[${hh}:${mm}:${ss}] [Alerta] Intervenção manual necessária.`,
        ],
      }
    : {
        id: `rel-${Date.now().toString().slice(-4)}`,
        title: cleanTitle,
        scriptName: cleanScript,
        environment: cleanEnv,
        operator: subscriptionState.workspaceName,
        createdAt: dateStr,
        durationSec: 9.4,
        status: ReleaseStatus.CONCLUIDA,
        exitCode: 0,
        checksum,
        steps: [
          {
            name: 'Preflight & Assinatura',
            status: 'Concluída',
            durationMs: 1580,
            detail: `SHA-256 ${checksum} verificado`,
          },
          {
            name: 'Snapshot de Estado',
            status: 'Concluída',
            durationMs: 2840,
            detail: 'Ponto de restauro guardado',
          },
          {
            name: 'Execução PowerShell',
            status: 'Concluída',
            durationMs: 3690,
            detail: `${cleanScript} concluído (ExitCode 0)`,
          },
          {
            name: 'Verificação Pós-Deploy',
            status: 'Concluída',
            durationMs: 1290,
            detail: 'Serviço operacional e validado',
          },
        ],
        logs: [
          `[${hh}:${mm}:${ss}] [PublicaFix] A iniciar "${cleanTitle}" (${cleanEnv})`,
          `[${hh}:${mm}:${ss}] [Preflight] Manifesto verificado: sha256:${checksum}`,
          `[${hh}:${mm}:${ss}] [Snapshot] Backup incremental concluído`,
          `[${hh}:${mm}:${ss}] [Execucao] Script concluído com código 0`,
          `[${hh}:${mm}:${ss}] [Verificacao] Publicação concluída com sucesso.`,
        ],
      };

  releasesStore = [newRelease, ...releasesStore];
  subscriptionState = {
    ...subscriptionState,
    usedQuotaThisMonth: subscriptionState.usedQuotaThisMonth + 1,
  };

  res.status(201).json({
    release: newRelease,
    subscription: subscriptionState,
  });
});

app.post('/api/releases/:id/rollback', (req, res) => {
  const { id } = req.params;
  const activePlan = PLANS.find((p) => p.id === subscriptionState.planId) ?? PLANS[0];

  if (!activePlan.supportsRollback) {
    res.status(403).json({
      error: 'A reversão automática em 1 clique requer o plano Profissional ou Empresarial.',
    });
    return;
  }

  const target = releasesStore.find((r) => r.id === id);
  if (!target) {
    res.status(404).json({ error: 'Publicação não encontrada.' });
    return;
  }

  const updated: ReleaseRecord = {
    ...target,
    status: ReleaseStatus.REVERTIDA,
    logs: [
      ...target.logs,
      `[${new Date().toTimeString().slice(0, 8)}] [Reversao] Estado restaurado para snapshot anterior por ação do operador.`,
    ],
  };

  releasesStore = releasesStore.map((r) => (r.id === id ? updated : r));
  res.json({ release: updated });
});

app.post('/api/subscriptions', (req, res) => {
  const {
    planId,
    cycle,
    currency,
    workspaceName,
    billingEmail,
    taxId,
    paymentMethod,
  } = req.body ?? {};

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    res.status(400).json({ error: 'Plano de mensalidade inválido.' });
    return;
  }

  const cleanCycle = cycle === BillingCycle.ANNUAL ? BillingCycle.ANNUAL : BillingCycle.MONTHLY;
  const cleanCurrency = currency === CurrencyCode.BRL ? CurrencyCode.BRL : CurrencyCode.EUR;

  if (typeof workspaceName !== 'string' || workspaceName.trim().length < 2) {
    res.status(400).json({ error: 'Indique o nome da equipa ou empresa.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof billingEmail !== 'string' || !emailRegex.test(billingEmail.trim())) {
    res.status(400).json({ error: 'Indique um endereço de email de faturação válido.' });
    return;
  }

  const unitMonthlyPrice = getPlanPrice(plan, cleanCycle, cleanCurrency);
  const subtotal =
    cleanCycle === BillingCycle.ANNUAL ? unitMonthlyPrice * 12 : unitMonthlyPrice;
  const vatRate = cleanCurrency === CurrencyCode.EUR ? 0.23 : 0.0;
  const vatAmount = Number((subtotal * vatRate).toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));

  const nextDate = new Date();
  if (cleanCycle === BillingCycle.ANNUAL) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  subscriptionState = {
    active: true,
    planId: plan.id,
    cycle: cleanCycle,
    currency: cleanCurrency,
    workspaceName: workspaceName.trim().slice(0, 80),
    billingEmail: billingEmail.trim().slice(0, 100),
    taxId: typeof taxId === 'string' ? taxId.trim().slice(0, 30) : '',
    paymentMethod:
      typeof paymentMethod === 'string' && paymentMethod.trim().length > 0
        ? paymentMethod.trim().slice(0, 60)
        : 'Cartão Visa •••• 4242',
    nextBillingDate: nextDate.toISOString().slice(0, 10),
    autoRenew: true,
    usedQuotaThisMonth: subscriptionState.usedQuotaThisMonth,
  };

  const nextNum = String(invoicesStore.length + 10).padStart(4, '0');
  const newInvoice: InvoiceRecord = {
    id: `inv-${Date.now()}`,
    number: `PF-2026-${nextNum}`,
    issuedAt: new Date().toISOString().slice(0, 10),
    planName: plan.name,
    cycle: cleanCycle,
    currency: cleanCurrency,
    subtotal,
    vatAmount,
    total,
    status: 'Paga',
    paymentMethod: subscriptionState.paymentMethod,
  };

  invoicesStore = [newInvoice, ...invoicesStore];

  res.status(201).json({
    subscription: subscriptionState,
    invoice: newInvoice,
    invoices: invoicesStore,
  });
});

app.post('/api/subscriptions/toggle-renew', (req, res) => {
  const { autoRenew } = req.body ?? {};
  subscriptionState = {
    ...subscriptionState,
    autoRenew: Boolean(autoRenew),
  };
  res.json({ subscription: subscriptionState });
});

app.put('/api/settings', (req, res) => {
  const { notificationEmail, webhookUrl, requireProdConfirmation, autoRollbackOnFailure } =
    req.body ?? {};
  teamSettingsStore = {
    notificationEmail:
      typeof notificationEmail === 'string'
        ? notificationEmail.trim().slice(0, 100)
        : teamSettingsStore.notificationEmail,
    webhookUrl:
      typeof webhookUrl === 'string'
        ? webhookUrl.trim().slice(0, 200)
        : teamSettingsStore.webhookUrl,
    requireProdConfirmation: Boolean(requireProdConfirmation),
    autoRollbackOnFailure: Boolean(autoRollbackOnFailure),
  };
  res.json({ settings: teamSettingsStore });
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
