import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type User } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { ORIGINAL_ATTACHED_CMD, analyzeAndModernizeScript } from './src/utils/scriptAudit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripePortalConfiguration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION || 'bpc_1Ug9Gr2VZXUfhutCKuxTaC3c';
const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');

const admin = supabaseUrl && supabaseSecret
  ? createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

// This application deliberately refuses Stripe test keys.
const stripe = /^(sk|rk)_live_/.test(stripeSecret) ? new Stripe(stripeSecret) : null;

const planConfiguration = {
  essencial: { priceId: process.env.STRIPE_PRICE_ESSENCIAL || 'price_1Ug9FX2VZXUfhutCzzLhenRY' },
  profissional: { priceId: process.env.STRIPE_PRICE_PROFISSIONAL || 'price_1Ug9FZ2VZXUfhutCaGvShtFv' },
  empresarial: { priceId: process.env.STRIPE_PRICE_EMPRESARIAL || 'price_1Ug9Fb2VZXUfhutCfQD1fx4S' },
} as const;

type PlanKey = keyof typeof planConfiguration;

const FREE_ANALYSIS_LIMIT = 5;
const PAID_ANALYSIS_LIMITS: Record<PlanKey, number> = {
  essencial: 50,
  profissional: 250,
  empresarial: 1000,
};

type SubscriptionRecord = {
  plan_key: string;
  status: string;
  current_period_end: string | null;
};

function resolveActivePlan(subscription: SubscriptionRecord | null): PlanKey | null {
  if (!subscription || !['active', 'trialing'].includes(subscription.status)) return null;
  if (subscription.current_period_end && Date.parse(subscription.current_period_end) <= Date.now()) return null;
  if (!(subscription.plan_key in planConfiguration)) return null;
  return subscription.plan_key as PlanKey;
}

function currentUtcMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function billingConfigurationReady(): boolean {
  return Boolean(
    process.env.PUBLICAFIX_LIVE_BILLING_ENABLED === 'true' &&
    admin &&
    stripe &&
    stripeWebhookSecret.startsWith('whsec_') &&
    stripePortalConfiguration.startsWith('bpc_') &&
    /^https:\/\//i.test(appUrl) &&
    planConfiguration.essencial.priceId &&
    planConfiguration.profissional.priceId &&
    planConfiguration.empresarial.priceId
  );
}

function sendApiError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

async function authenticatedUser(req: Request): Promise<User | null> {
  if (!admin) return null;
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
}

function planFromPrice(priceId: string): PlanKey | null {
  const match = (Object.entries(planConfiguration) as Array<[PlanKey, { priceId: string }]>)
    .find(([, config]) => config.priceId === priceId);
  return match?.[0] || null;
}

function unixToIso(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

async function syncStripeSubscription(subscription: Stripe.Subscription) {
  if (!admin) throw new Error('Backend Supabase não configurado.');

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;
  const item = subscription.items.data[0];
  if (!item) throw new Error('A subscrição Stripe não contém um item de preço.');

  let userId = subscription.metadata?.supabase_user_id || null;
  if (!userId) {
    const { data: customer, error } = await admin
      .from('billing_customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (error) throw error;
    userId = customer?.user_id || null;
  }
  if (!userId) throw new Error('Não foi possível associar a subscrição Stripe a uma conta PublicaFix.');

  const priceId = item.price.id;
  const planKey = (subscription.metadata?.plan_key as PlanKey | undefined) || planFromPrice(priceId);
  if (!planKey || planConfiguration[planKey].priceId !== priceId) {
    throw new Error('O preço da subscrição não corresponde a um plano PublicaFix configurado.');
  }

  const periodStart = unixToIso(item.current_period_start);
  const periodEnd = unixToIso(item.current_period_end);
  const currentTime = new Date().toISOString();

  const { error: billingError } = await admin
    .from('billing_subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_key: planKey,
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: unixToIso(subscription.cancel_at),
      canceled_at: unixToIso(subscription.canceled_at),
      updated_at: currentTime,
    }, { onConflict: 'stripe_subscription_id' });
  if (billingError) throw billingError;

  const { error: entitlementError } = await admin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_key: planKey,
      status: subscription.status,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: currentTime,
    }, { onConflict: 'user_id' });
  if (entitlementError) throw entitlementError;
}

async function handleStripeEvent(event: Stripe.Event) {
  if (!stripe) throw new Error('Stripe em modo real não está configurado.');

  if (event.type.startsWith('customer.subscription.')) {
    await syncStripeSubscription(event.data.object as Stripe.Subscription);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncStripeSubscription(subscription);
    }
  }
}

// Stripe webhooks must receive the unparsed request body for signature validation.
// This route is deliberately registered before express.json().
app.post('/api/stripe-webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    sendApiError(res, 503, 'O endpoint de pagamentos ainda não está configurado.');
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string' || !Buffer.isBuffer(req.body)) {
    sendApiError(res, 400, 'Assinatura Stripe ou corpo da mensagem inválido.');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch {
    sendApiError(res, 400, 'Não foi possível validar a assinatura do webhook Stripe.');
    return;
  }

  if (!admin) {
    sendApiError(res, 503, 'A ligação segura à base de dados ainda não está configurada.');
    return;
  }

  const { error: eventInsertError } = await admin
    .from('billing_webhook_events')
    .insert({ event_id: event.id, event_type: event.type });

  if (eventInsertError?.code === '23505') {
    res.json({ received: true, duplicate: true });
    return;
  }
  if (eventInsertError) {
    sendApiError(res, 500, 'Não foi possível registar o evento de faturação.');
    return;
  }

  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    await admin.from('billing_webhook_events').delete().eq('event_id', event.id);
    console.error('PublicaFix webhook processing failed:', error instanceof Error ? error.message : 'unknown error');
    sendApiError(res, 500, 'O evento de faturação não foi processado. O Stripe poderá tentar novamente.');
  }
});

app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'PublicaFix',
    mode: 'static-audit-beta',
    authConfigured: Boolean(admin),
    liveBillingConfigured: billingConfigurationReady(),
  });
});

app.get('/api/public-config', async (_req, res) => {
  if (!billingConfigurationReady() || !stripe) {
    res.json({ billingReady: false, prices: {} });
    return;
  }

  try {
    const entries = Object.entries(planConfiguration) as Array<[PlanKey, { priceId: string }]>;
    const checked = await Promise.all(entries.map(async ([planKey, config]) => {
      const price = await stripe.prices.retrieve(config.priceId);
      if (
        !price.active ||
        !price.livemode ||
        price.currency !== 'eur' ||
        price.recurring?.interval !== 'month' ||
        typeof price.unit_amount !== 'number' ||
        !Number.isInteger(price.unit_amount) ||
        price.unit_amount <= 0
      ) {
        throw new Error('Invalid live monthly EUR price configured for ' + planKey);
      }
      return [planKey, price.unit_amount] as const;
    }));

    const prices = Object.fromEntries(checked) as Record<PlanKey, number>;
    res.json({ billingReady: true, prices });
  } catch (error) {
    console.error('PublicaFix price configuration check failed:', error instanceof Error ? error.message : 'unknown error');
    res.json({ billingReady: false, prices: {} });
  }
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

app.post('/api/audit-script', async (req, res) => {
  const user = await authenticatedUser(req);
  if (!user) {
    sendApiError(res, 401, 'Inicia sessão para utilizar as análises do PublicaFix.');
    return;
  }
  if (!admin) {
    sendApiError(res, 503, 'A ligação à base de dados ainda não está configurada.');
    return;
  }

  const body = req.body ?? {};
  const { filename, content } = body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    sendApiError(res, 400, 'O conteúdo do script não pode estar vazio.');
    return;
  }
  if (Buffer.byteLength(content, 'utf8') > 32 * 1024) {
    sendApiError(res, 413, 'O script excede o limite de 32 KB para análise.');
    return;
  }

  const requestedName = typeof filename === 'string' ? filename : 'script.cmd';
  const safeFilename = requestedName.replace(/^.*[\\/]/, '').replace(/[^\w.-]/g, '_').slice(0, 80);
  if (!/\.(cmd|bat|ps1)$/i.test(safeFilename)) {
    sendApiError(res, 400, 'Formato não suportado. Use .cmd, .bat ou .ps1.');
    return;
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('plan_key,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    sendApiError(res, 500, 'Não foi possível consultar o plano desta conta.');
    return;
  }

  const activePlan = resolveActivePlan(subscription as SubscriptionRecord | null);
  const planKey = activePlan || 'gratuito';
  const limit = activePlan ? PAID_ANALYSIS_LIMITS[activePlan] : FREE_ANALYSIS_LIMIT;
  const audit = analyzeAndModernizeScript(safeFilename, content);

  const { data: quotaRows, error: quotaError } = await admin.rpc('consume_analysis_quota', {
    p_user_id: user.id,
    p_limit: limit,
  });

  if (quotaError) {
    console.error('PublicaFix analysis quota failed:', quotaError.message);
    sendApiError(res, 503, 'Não foi possível validar o limite mensal de análises. Tenta novamente.');
    return;
  }

  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
  if (!quota || quota.allowed !== true) {
    res.status(429).json({
      error: 'Atingiste o limite mensal do plano atual. Podes voltar a analisar scripts no próximo mês ou escolher outro plano.',
      usage: {
        plan: planKey,
        used: Number(quota?.used_count ?? limit),
        limit,
        remaining: 0,
        monthStart: quota?.month_start || currentUtcMonthStart(),
      },
    });
    return;
  }

  const used = Number(quota.used_count);
  res.json({
    audit,
    engine: 'publicafix-static-rules-v1',
    stored: false,
    executed: false,
    usage: {
      plan: planKey,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      monthStart: quota.month_start || currentUtcMonthStart(),
    },
  });
});

app.get('/api/billing-status', async (req, res) => {
  const user = await authenticatedUser(req);
  if (!user) {
    sendApiError(res, 401, 'Inicia sessão para consultar a tua subscrição.');
    return;
  }
  if (!admin) {
    sendApiError(res, 503, 'A ligação à base de dados ainda não está configurada.');
    return;
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('plan_key,status,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    sendApiError(res, 500, 'Não foi possível consultar o estado da subscrição.');
    return;
  }

  const activePlan = resolveActivePlan(subscription as SubscriptionRecord | null);
  const planKey = activePlan || 'gratuito';
  const limit = activePlan ? PAID_ANALYSIS_LIMITS[activePlan] : FREE_ANALYSIS_LIMIT;
  const monthStart = currentUtcMonthStart();

  const { data: usageRow, error: usageError } = await admin
    .from('analysis_usage_monthly')
    .select('used_count')
    .eq('user_id', user.id)
    .eq('month_start', monthStart)
    .maybeSingle();

  if (usageError) {
    sendApiError(res, 500, 'Não foi possível consultar a utilização mensal.');
    return;
  }

  const used = Number(usageRow?.used_count ?? 0);
  res.json({
    subscription: subscription || null,
    usage: {
      plan: planKey,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      monthStart,
    },
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!billingConfigurationReady() || !stripe || !admin) {
    sendApiError(res, 503, 'As subscrições reais ainda não estão configuradas.');
    return;
  }

  const user = await authenticatedUser(req);
  if (!user) {
    sendApiError(res, 401, 'Inicia sessão antes de subscrever.');
    return;
  }

  const planKey = req.body?.planKey as PlanKey | undefined;
  if (!planKey || !(planKey in planConfiguration)) {
    sendApiError(res, 400, 'Plano inválido.');
    return;
  }

  const { data: existingSubscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    sendApiError(res, 500, 'Não foi possível verificar a subscrição atual.');
    return;
  }
  if (existingSubscription && ['active', 'trialing', 'past_due', 'unpaid'].includes(existingSubscription.status)) {
    sendApiError(res, 409, 'Já existe uma subscrição associada a esta conta. Usa a área de gestão da subscrição.');
    return;
  }

  try {
    const priceId = planConfiguration[planKey].priceId;
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || !price.livemode || price.currency !== 'eur' || price.recurring?.interval !== 'month') {
      sendApiError(res, 409, 'O preço configurado não está ativo como subscrição mensal em euros no Stripe real.');
      return;
    }

    const { data: existingCustomer, error: customerLookupError } = await admin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (customerLookupError) throw customerLookupError;

    let stripeCustomerId = existingCustomer?.stripe_customer_id || null;
    if (stripeCustomerId) {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if ('deleted' in customer && customer.deleted) stripeCustomerId = null;
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined,
        metadata: { supabase_user_id: user.id, product: 'publicafix' },
      });
      stripeCustomerId = customer.id;
    }

    const { error: customerSaveError } = await admin
      .from('billing_customers')
      .upsert({ user_id: user.id, stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (customerSaveError) throw customerSaveError;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl + '/?checkout=success',
      cancel_url: appUrl + '/?checkout=cancelled',
      metadata: { product: 'publicafix', supabase_user_id: user.id, plan_key: planKey },
      subscription_data: {
        metadata: { product: 'publicafix', supabase_user_id: user.id, plan_key: planKey },
      },
    });

    if (!session.url) {
      sendApiError(res, 502, 'O Stripe não devolveu um endereço de pagamento.');
      return;
    }
    res.json({ url: session.url });
  } catch (error) {
    console.error('PublicaFix checkout creation failed:', error instanceof Error ? error.message : 'unknown error');
    sendApiError(res, 502, 'Não foi possível criar a sessão de subscrição no Stripe.');
  }
});

app.post('/api/create-portal-session', async (req, res) => {
  if (!billingConfigurationReady() || !stripe || !admin) {
    sendApiError(res, 503, 'A gestão de faturação ainda não está configurada.');
    return;
  }

  const user = await authenticatedUser(req);
  if (!user) {
    sendApiError(res, 401, 'Inicia sessão para gerir a faturação.');
    return;
  }

  try {
    const { data: customer, error } = await admin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!customer?.stripe_customer_id) {
      sendApiError(res, 404, 'Ainda não existe um cliente Stripe associado a esta conta.');
      return;
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: appUrl + '/?billing=returned',
    });
    res.json({ url: portal.url });
  } catch (error) {
    console.error('PublicaFix customer portal failed:', error instanceof Error ? error.message : 'unknown error');
    sendApiError(res, 502, 'Não foi possível abrir o portal de faturação Stripe.');
  }
});

app.all(['/api/workspace', '/api/settings'], (_req, res) => {
  sendApiError(res, 503, 'As áreas de trabalho guardadas ainda não estão disponíveis.');
});
app.all(['/api/releases', '/api/releases/:id/rollback'], (_req, res) => {
  sendApiError(res, 503, 'O PublicaFix não executa nem reverte scripts nesta versão.');
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('PublicaFix request failed:', error instanceof Error ? error.message : 'unknown error');
  if (!res.headersSent) sendApiError(res, 500, 'Ocorreu um erro interno. Tenta novamente.');
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
    console.log('PublicaFix server listening on port ' + PORT);
  });
}

if (process.env.VERCEL !== '1') {
  void startServer();
}

export default app;
