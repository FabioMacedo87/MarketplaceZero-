import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import {
  CREDIT_PACKS,
  INITIAL_ACCOUNTS,
  INITIAL_LEDGER,
  INITIAL_VOUCHERS,
} from './src/data/creditCatalog.ts';
import {
  LedgerEntryType,
  VoucherStatus,
  type CreditAccount,
  type CreditVoucher,
  type LedgerEntry,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

let accountsStore: CreditAccount[] = INITIAL_ACCOUNTS.map((a) => ({ ...a }));
let vouchersStore: CreditVoucher[] = INITIAL_VOUCHERS.map((v) => ({ ...v }));
let ledgerStore: LedgerEntry[] = INITIAL_LEDGER.map((l) => ({ ...l }));
const processedStripeSessions = new Set<string>();

function nowStamp(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function resolveAppOrigin(req: express.Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl) && !envUrl.includes('MY_APP_URL')) {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function applyCreditDelta(
  accountId: string,
  delta: number,
  type: LedgerEntryType,
  reference: string,
): { account: CreditAccount; entry: LedgerEntry } {
  const idx = accountsStore.findIndex((a) => a.id === accountId);
  if (idx === -1) {
    throw new Error('Conta de destino não encontrada.');
  }

  const current = accountsStore[idx];
  const balanceBefore = current.balance;
  const balanceAfter = balanceBefore + delta;

  if (balanceAfter < 0) {
    throw new Error(
      `Saldo insuficiente (${balanceBefore} créditos disponíveis, necessários ${Math.abs(delta)}).`,
    );
  }

  const stamp = nowStamp();
  const updated: CreditAccount = {
    ...current,
    balance: balanceAfter,
    totalIssued: delta > 0 ? current.totalIssued + delta : current.totalIssued,
    totalConsumed: delta < 0 ? current.totalConsumed + Math.abs(delta) : current.totalConsumed,
    updatedAt: stamp,
  };

  accountsStore[idx] = updated;

  const entry: LedgerEntry = {
    id: `led-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    accountId: updated.id,
    accountName: updated.name,
    type,
    delta,
    balanceBefore,
    balanceAfter,
    reference: reference.slice(0, 120),
    createdAt: stamp,
  };

  ledgerStore = [entry, ...ledgerStore];
  return { account: updated, entry };
}

// Stripe Webhook must receive raw body before express.json()
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !webhookSecret) {
      res.status(503).json({ error: 'Stripe webhook não configurado no servidor.' });
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      res.status(400).json({ error: 'Assinatura Stripe em falta.' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch {
      res.status(400).json({ error: 'Assinatura Stripe inválida.' });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (processedStripeSessions.has(session.id)) {
        res.json({ received: true, duplicate: true });
        return;
      }

      const accountId = session.metadata?.accountId;
      const packId = session.metadata?.packId;
      const pack = CREDIT_PACKS.find((p) => p.id === packId);

      if (accountId && pack && session.payment_status === 'paid') {
        try {
          applyCreditDelta(
            accountId,
            pack.credits,
            pack.kind === 'subscription'
              ? LedgerEntryType.SUBSCRICAO_MENSAL
              : LedgerEntryType.COMPRA_STRIPE,
            `${pack.name} · Stripe ${session.id.slice(-8)}`,
          );
          processedStripeSessions.add(session.id);
        } catch {
          // Account not found in memory store
        }
      }
    }

    res.json({ received: true });
  },
);

app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CreditoHub' });
});

app.get('/api/credits/repository', (_req, res) => {
  res.json({
    accounts: accountsStore,
    vouchers: vouchersStore,
    ledger: ledgerStore,
    packs: CREDIT_PACKS,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  });
});

app.post('/api/credits/accounts', (req, res) => {
  const { name, email, planName } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Indique o nome da conta ou equipa (mínimo 2 caracteres).' });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
    res.status(400).json({ error: 'Indique um endereço de email válido.' });
    return;
  }

  const newAccount: CreditAccount = {
    id: `acc-${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim().slice(0, 80),
    email: email.trim().slice(0, 100),
    planName:
      typeof planName === 'string' && planName.trim().length > 0
        ? planName.trim().slice(0, 40)
        : 'Conta Personalizada',
    balance: 0,
    totalIssued: 0,
    totalConsumed: 0,
    updatedAt: nowStamp(),
  };

  accountsStore = [newAccount, ...accountsStore];
  res.status(201).json({ account: newAccount, accounts: accountsStore });
});

app.post('/api/credits/issue', (req, res) => {
  const { accountId, amount, reference } = req.body ?? {};
  const parsedAmount = Number(amount);

  if (typeof accountId !== 'string' || !accountId.trim()) {
    res.status(400).json({ error: 'Selecione uma conta de destino.' });
    return;
  }
  if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 1_000_000) {
    res.status(400).json({ error: 'A quantidade deve ser um número inteiro entre 1 e 1.000.000.' });
    return;
  }

  const cleanRef =
    typeof reference === 'string' && reference.trim().length > 0
      ? reference.trim()
      : 'Emissão administrativa de créditos';

  try {
    const result = applyCreditDelta(
      accountId.trim(),
      parsedAmount,
      LedgerEntryType.EMISSAO_MANUAL,
      cleanRef,
    );
    res.status(201).json({
      ...result,
      accounts: accountsStore,
      ledger: ledgerStore,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao emitir créditos.' });
  }
});

app.post('/api/credits/consume', (req, res) => {
  const { accountId, amount, operation } = req.body ?? {};
  const parsedAmount = Number(amount);

  if (typeof accountId !== 'string' || !accountId.trim()) {
    res.status(400).json({ error: 'Selecione uma conta para registar o consumo.' });
    return;
  }
  if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 100_000) {
    res.status(400).json({ error: 'O consumo deve ser um número inteiro entre 1 e 100.000.' });
    return;
  }

  const cleanOp =
    typeof operation === 'string' && operation.trim().length > 0
      ? operation.trim()
      : 'Operação de consumo de créditos';

  try {
    const result = applyCreditDelta(
      accountId.trim(),
      -parsedAmount,
      LedgerEntryType.CONSUMO_OPERACIONAL,
      cleanOp,
    );
    res.status(201).json({
      ...result,
      accounts: accountsStore,
      ledger: ledgerStore,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Saldo insuficiente.' });
  }
});

app.post('/api/vouchers', (req, res) => {
  const { customCode, credits, maxUses, expiresAt, note } = req.body ?? {};
  const parsedCredits = Number(credits);
  const parsedUses = Number(maxUses);

  if (!Number.isInteger(parsedCredits) || parsedCredits < 1 || parsedCredits > 100_000) {
    res.status(400).json({ error: 'Os créditos do voucher devem estar entre 1 e 100.000.' });
    return;
  }
  if (!Number.isInteger(parsedUses) || parsedUses < 1 || parsedUses > 10_000) {
    res.status(400).json({ error: 'O limite de utilizações deve estar entre 1 e 10.000.' });
    return;
  }

  const generated = `CREDI-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;
  const code =
    typeof customCode === 'string' && customCode.trim().length >= 4
      ? customCode
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '')
          .slice(0, 28)
      : generated;

  if (vouchersStore.some((v) => v.code === code)) {
    res.status(400).json({ error: `O código ${code} já existe no repositório.` });
    return;
  }

  const validDate =
    typeof expiresAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)
      ? expiresAt
      : '2027-01-31';

  const voucher: CreditVoucher = {
    id: `vch-${Date.now()}`,
    code,
    credits: parsedCredits,
    maxUses: parsedUses,
    usedCount: 0,
    expiresAt: validDate,
    status: VoucherStatus.ATIVO,
    note:
      typeof note === 'string' && note.trim().length > 0
        ? note.trim().slice(0, 80)
        : 'Código gerado no repositório',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  vouchersStore = [voucher, ...vouchersStore];
  res.status(201).json({ voucher, vouchers: vouchersStore });
});

app.post('/api/vouchers/redeem', (req, res) => {
  const { code, accountId } = req.body ?? {};
  if (typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ error: 'Indique o código do voucher a resgatar.' });
    return;
  }
  if (typeof accountId !== 'string' || !accountId.trim()) {
    res.status(400).json({ error: 'Selecione a conta que vai receber os créditos.' });
    return;
  }

  const cleanCode = code.trim().toUpperCase();
  const idx = vouchersStore.findIndex((v) => v.code === cleanCode);
  if (idx === -1) {
    res.status(404).json({ error: `Código "${cleanCode}" não encontrado.` });
    return;
  }

  const voucher = vouchersStore[idx];
  const today = new Date().toISOString().slice(0, 10);
  if (voucher.expiresAt < today) {
    vouchersStore[idx] = { ...voucher, status: VoucherStatus.EXPIRADO };
    res.status(400).json({ error: 'Este voucher expirou e já não pode ser resgatado.' });
    return;
  }
  if (voucher.usedCount >= voucher.maxUses || voucher.status !== VoucherStatus.ATIVO) {
    vouchersStore[idx] = { ...voucher, status: VoucherStatus.ESGOTADO };
    res.status(400).json({ error: 'Este voucher atingiu o limite máximo de utilizações.' });
    return;
  }

  try {
    const { account, entry } = applyCreditDelta(
      accountId.trim(),
      voucher.credits,
      LedgerEntryType.RESGATE_VOUCHER,
      `Voucher ${voucher.code}`,
    );

    const nextUsed = voucher.usedCount + 1;
    vouchersStore[idx] = {
      ...voucher,
      usedCount: nextUsed,
      status: nextUsed >= voucher.maxUses ? VoucherStatus.ESGOTADO : VoucherStatus.ATIVO,
    };

    res.json({
      account,
      entry,
      accounts: accountsStore,
      vouchers: vouchersStore,
      ledger: ledgerStore,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro no resgate.' });
  }
});

app.post('/api/stripe/checkout-session', async (req, res) => {
  const { packId, accountId } = req.body ?? {};
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    res.status(400).json({ error: 'Pacote de créditos inválido.' });
    return;
  }

  const account = accountsStore.find((a) => a.id === accountId);
  if (!account) {
    res.status(400).json({ error: 'Conta de destino não encontrada.' });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({
      error:
        'A chave STRIPE_SECRET_KEY ainda não está configurada em Settings > Secrets. Configure-a no servidor para abrir o Checkout Stripe real.',
    });
    return;
  }

  const origin = resolveAppOrigin(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: pack.kind === 'subscription' ? 'subscription' : 'payment',
      customer_email: account.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${pack.name} — ${pack.credits.toLocaleString('pt-PT')} créditos`,
              description: pack.description,
            },
            unit_amount: Math.round(pack.priceEur * 100),
            ...(pack.kind === 'subscription' ? { recurring: { interval: 'month' } } : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        accountId: account.id,
        packId: pack.id,
        credits: String(pack.credits),
      },
      success_url: `${origin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?stripe_status=cancelled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro ao criar sessão no Stripe.',
    });
  }
});

app.post('/api/stripe/verify-session', async (req, res) => {
  const { sessionId } = req.body ?? {};
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    res.status(400).json({ error: 'ID de sessão Stripe inválido.' });
    return;
  }

  if (processedStripeSessions.has(sessionId)) {
    res.json({
      alreadyProcessed: true,
      accounts: accountsStore,
      ledger: ledgerStore,
    });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: 'STRIPE_SECRET_KEY não configurada.' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      res.status(400).json({ error: 'Pagamento ainda não confirmado pelo Stripe.' });
      return;
    }

    const accountId = session.metadata?.accountId;
    const packId = session.metadata?.packId;
    const pack = CREDIT_PACKS.find((p) => p.id === packId);

    if (!accountId || !pack) {
      res.status(400).json({ error: 'Metadados da sessão incompletos.' });
      return;
    }

    const { account, entry } = applyCreditDelta(
      accountId,
      pack.credits,
      pack.kind === 'subscription'
        ? LedgerEntryType.SUBSCRICAO_MENSAL
        : LedgerEntryType.COMPRA_STRIPE,
      `${pack.name} · Stripe ${session.id.slice(-8)}`,
    );
    processedStripeSessions.add(sessionId);

    res.json({
      account,
      entry,
      accounts: accountsStore,
      ledger: ledgerStore,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Erro ao verificar sessão Stripe.',
    });
  }
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
    console.log(`CreditoHub server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
