import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase.ts';

interface SubscriptionSummary {
  plan_key: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface AccountSectionProps {
  billingReady: boolean;
}

interface UsageSummary {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  monthStart: string;
}

const statusLabels: Record<string, string> = {
  trialing: 'Período experimental',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  unpaid: 'Por regularizar',
  incomplete: 'A aguardar pagamento',
  incomplete_expired: 'Pagamento expirado',
  paused: 'Em pausa',
};

const planLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  essencial: 'Essencial',
  profissional: 'Profissional',
  empresarial: 'Empresarial',
};

export const AccountSection: React.FC<AccountSectionProps> = ({ billingReady }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setSubscription(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setSubscription(null);
      setUsage(null);
      return;
    }

    let active = true;
    fetch('/api/billing-status', {
      headers: { Authorization: 'Bearer ' + session.access_token },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ subscription: SubscriptionSummary | null; usage: UsageSummary }>;
      })
      .then((data) => {
        if (active && data) {
          setSubscription(data.subscription);
          setUsage(data.usage);
        }
      })
      .catch(() => {
        if (active) {
          setSubscription(null);
          setUsage(null);
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setNotice('');
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          setNotice('Conta criada e sessão iniciada.');
        } else {
          setNotice('Conta criada. Confirma o endereço de email através da mensagem que te enviámos antes de iniciar sessão.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setNotice('Sessão iniciada com sucesso.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível concluir a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : 'Sessão terminada.');
    setLoading(false);
  };

  const openBillingPortal = async () => {
    if (!session) return;
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== 'string') {
        throw new Error(data.error || 'Não foi possível abrir a gestão da subscrição.');
      }
      window.location.assign(data.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível abrir a gestão da subscrição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="conta" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-wide text-[#1D4ED8]">ÁREA PESSOAL</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] mt-2">
            A tua conta PublicaFix
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Cria uma conta ou inicia sessão para consultar a tua subscrição e gerir os pagamentos.
          </p>
        </div>

        {!supabaseConfigured ? (
          <div className="mt-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            A autenticação ainda não está ligada ao alojamento. Falta configurar a URL do Supabase e a chave publicável nas variáveis de ambiente do site.
          </div>
        ) : session ? (
          <div className="mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Sessão iniciada como</p>
                <p className="mt-1 font-semibold text-[#0F172A] break-all">{session.user.email}</p>
              </div>
              <button type="button" onClick={handleSignOut} disabled={loading} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Terminar sessão
              </button>
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Subscrição atual</p>
              {subscription ? (
                <>
                  <p className="mt-2 font-semibold text-[#0F172A]">
                    {planLabels[subscription.plan_key] || subscription.plan_key} · {statusLabels[subscription.status] || subscription.status}
                  </p>
                  {subscription.current_period_end && (
                    <p className="mt-1 text-sm text-slate-600">
                      Período até {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                  {subscription.cancel_at_period_end && (
                    <p className="mt-1 text-sm text-amber-700">A subscrição termina no fim do período atual.</p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Conta gratuita · sem subscrição paga ativa.</p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Utilização mensal</p>
              {usage ? (
                <>
                  <p className="mt-2 font-semibold text-[#0F172A]">
                    {planLabels[usage.plan] || usage.plan} · {usage.used} de {usage.limit} análises utilizadas
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {usage.remaining} {usage.remaining === 1 ? 'análise restante' : 'análises restantes'} este mês
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">A consultar a utilização deste mês…</p>
              )}
            </div>

            {billingReady && (
              <div className="mt-5">
                <button type="button" onClick={openBillingPortal} disabled={loading} className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#1D4ED8] text-white hover:bg-[#1E40AF] disabled:opacity-50">
                  Gerir subscrição e faturação
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleAuth} className="mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-2 mb-6">
              <button type="button" onClick={() => { setIsSignUp(false); setNotice(''); }} className={'px-4 py-2 text-sm font-semibold rounded-lg ' + (!isSignUp ? 'bg-[#1D4ED8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                Iniciar sessão
              </button>
              <button type="button" onClick={() => { setIsSignUp(true); setNotice(''); }} className={'px-4 py-2 text-sm font-semibold rounded-lg ' + (isSignUp ? 'bg-[#1D4ED8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                Criar conta
              </button>
            </div>

            {isSignUp && (
              <label className="block text-sm font-medium text-slate-700 mb-4">
                Nome
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={80} required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100" />
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700 mb-4">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100" />
            </label>

            <label className="block text-sm font-medium text-slate-700 mb-5">
              Palavra-passe
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100" />
            </label>

            <button type="submit" disabled={loading} className="w-full px-4 py-3 text-sm font-semibold rounded-lg bg-[#1D4ED8] text-white hover:bg-[#1E40AF] disabled:opacity-50">
              {loading ? 'A processar…' : isSignUp ? 'Criar conta gratuita' : 'Entrar'}
            </button>
            <p className="mt-3 text-xs text-slate-500">
              A conta gratuita inclui 5 análises por mês. Ao criares uma conta, poderás receber um email para confirmar o endereço antes de iniciar sessão.
            </p>
          </form>
        )}

        {notice && <p role="status" className="mt-4 max-w-2xl text-sm text-slate-700">{notice}</p>}
      </div>
    </section>
  );
};
