import React, { useState } from 'react';
import { Minus, Plus, UserPlus } from 'lucide-react';
import type { CreditAccount } from '../types.ts';

interface CreditIssuancePanelProps {
  accounts: CreditAccount[];
  selectedAccountId: string;
  onSelectAccountId: (id: string) => void;
  onIssueCredits: (accountId: string, amount: number, reference: string) => Promise<void>;
  onConsumeCredits: (accountId: string, amount: number, operation: string) => Promise<void>;
  onCreateAccount: (name: string, email: string, planName: string) => Promise<void>;
}

const PRESET_CONSUMPTIONS = [
  { label: 'Imagem 4K', cost: 10 },
  { label: 'Lote 5 Imagens', cost: 40 },
  { label: 'Vídeo 10s (1080p)', cost: 50 },
];

export const CreditIssuancePanel: React.FC<CreditIssuancePanelProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccountId,
  onIssueCredits,
  onConsumeCredits,
  onCreateAccount,
}) => {
  const [issueAmount, setIssueAmount] = useState('500');
  const [issueRef, setIssueRef] = useState('Emissão mensal de créditos de estúdio');
  const [consumeAmount, setConsumeAmount] = useState('50');
  const [consumeOp, setConsumeOp] = useState('Renderização Vídeo 10s (1080p)');

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('Pacote Inicial');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = Number(issueAmount);
    if (!Number.isInteger(num) || num < 1) {
      setFeedback({ type: 'err', text: 'Indique uma quantidade inteira positiva de créditos.' });
      return;
    }
    setBusy(true);
    try {
      await onIssueCredits(selectedAccountId, num, issueRef);
      setFeedback({
        type: 'ok',
        text: `+${num.toLocaleString('pt-PT')} créditos emitidos para ${selectedAccount?.name ?? 'a conta'}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao emitir créditos.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = Number(consumeAmount);
    if (!Number.isInteger(num) || num < 1) {
      setFeedback({ type: 'err', text: 'Indique um consumo inteiro positivo.' });
      return;
    }
    setBusy(true);
    try {
      await onConsumeCredits(selectedAccountId, num, consumeOp);
      setFeedback({
        type: 'ok',
        text: `-${num.toLocaleString('pt-PT')} créditos descontados (${consumeOp}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Saldo insuficiente para o consumo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      await onCreateAccount(newName, newEmail, newPlan);
      setNewName('');
      setNewEmail('');
      setShowNewAccount(false);
      setFeedback({ type: 'ok', text: 'Nova conta adicionada ao repositório.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao criar conta.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F172A]">
            Emissão e Consumo de Créditos
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Selecione a conta alvo para gerar novos créditos ou registar deduções de utilização.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewAccount(!showNewAccount)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          {showNewAccount ? 'Cancelar Nova Conta' : 'Criar Conta'}
        </button>
      </div>

      {showNewAccount && (
        <form
          onSubmit={handleCreateAccount}
          className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label htmlFor="acc-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Equipa / Cliente
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Estúdio Atlântico"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
            />
          </div>
          <div>
            <label htmlFor="acc-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email da Conta
            </label>
            <input
              id="acc-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="equipa@empresa.pt"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
            />
          </div>
          <div>
            <label htmlFor="acc-plan" className="block text-xs font-semibold text-slate-700 mb-1">
              Etiqueta do Plano
            </label>
            <input
              id="acc-plan"
              type="text"
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Adicionar Conta
          </button>
        </form>
      )}

      {/* Account Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => onSelectAccountId(acc.id)}
              className={`text-left p-5 rounded-xl border transition-colors cursor-pointer bg-white ${
                isSelected ? 'border-[#1D4ED8]' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{acc.planName}</span>
                {isSelected && <span className="font-semibold text-[#1D4ED8]">Selecionada</span>}
              </div>
              <p className="font-display text-base font-bold text-[#0F172A] mt-1 truncate">
                {acc.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{acc.email}</p>
              <p className="mt-4 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
                {acc.balance.toLocaleString('pt-PT')}{' '}
                <span className="text-xs font-sans text-slate-500">créditos</span>
              </p>
            </button>
          );
        })}
      </div>

      {feedback && (
        <p
          role="status"
          className={`text-sm font-medium ${
            feedback.type === 'ok' ? 'text-[#16A34A]' : 'text-[#DC2626]'
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Credits Form */}
        <form
          onSubmit={handleIssue}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Gerar e Emitir Créditos
            </h3>
            <span className="text-xs text-slate-500">
              Destino: <strong className="text-[#0F172A]">{selectedAccount?.name}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[100, 500, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setIssueAmount(String(preset))}
                className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-md transition-colors tabular-nums cursor-pointer"
              >
                +{preset.toLocaleString('pt-PT')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="issue-amount"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Quantidade
              </label>
              <input
                id="issue-amount"
                type="number"
                min={1}
                max={1000000}
                required
                value={issueAmount}
                onChange={(e) => setIssueAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="issue-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo / Referência
              </label>
              <input
                id="issue-ref"
                type="text"
                required
                value={issueRef}
                onChange={(e) => setIssueRef(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Emitir Créditos na Conta
          </button>
        </form>

        {/* Consume Credits Form */}
        <form
          onSubmit={handleConsume}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Registar Consumo Operacional
            </h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              Saldo: {selectedAccount?.balance.toLocaleString('pt-PT') ?? 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_CONSUMPTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setConsumeAmount(String(item.cost));
                  setConsumeOp(item.label);
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-md transition-colors cursor-pointer"
              >
                {item.label} (-{item.cost})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="consume-amount"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Créditos a Descontar
              </label>
              <input
                id="consume-amount"
                type="number"
                min={1}
                max={100000}
                required
                value={consumeAmount}
                onChange={(e) => setConsumeAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="consume-op" className="block text-xs font-semibold text-slate-700 mb-1">
                Operação Executada
              </label>
              <input
                id="consume-op"
                type="text"
                required
                value={consumeOp}
                onChange={(e) => setConsumeOp(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
            Descontar do Saldo
          </button>
        </form>
      </div>
    </section>
  );
};
