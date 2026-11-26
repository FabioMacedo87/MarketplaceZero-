import React, { useState } from 'react';
import { Check, Copy, Ticket } from 'lucide-react';
import { VoucherStatus, type CreditAccount, type CreditVoucher } from '../types.ts';

interface VoucherRepositoryProps {
  vouchers: CreditVoucher[];
  accounts: CreditAccount[];
  selectedAccountId: string;
  onCreateVoucher: (payload: {
    customCode: string;
    credits: number;
    maxUses: number;
    expiresAt: string;
    note: string;
  }) => Promise<void>;
  onRedeemVoucher: (code: string, accountId: string) => Promise<void>;
}

export const VoucherRepository: React.FC<VoucherRepositoryProps> = ({
  vouchers,
  accounts,
  selectedAccountId,
  onCreateVoucher,
  onRedeemVoucher,
}) => {
  const [customCode, setCustomCode] = useState('');
  const [credits, setCredits] = useState('250');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresAt, setExpiresAt] = useState('2027-03-31');
  const [note, setNote] = useState('Lote promocional de créditos');

  const [redeemCode, setRedeemCode] = useState('CREDI-2026-BEMVINDO');
  const [redeemAccountId, setRedeemAccountId] = useState(selectedAccountId);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await onCreateVoucher({
        customCode,
        credits: Number(credits),
        maxUses: Number(maxUses),
        expiresAt,
        note,
      });
      setCustomCode('');
      setMessage({ type: 'ok', text: 'Novo código de créditos gerado no repositório.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao gerar voucher.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await onRedeemVoucher(redeemCode, redeemAccountId || selectedAccountId);
      setMessage({ type: 'ok', text: `Voucher ${redeemCode.toUpperCase()} resgatado com sucesso.` });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível resgatar o código.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const statusColor = (status: VoucherStatus) => {
    if (status === VoucherStatus.ATIVO) return 'text-[#16A34A]';
    if (status === VoucherStatus.ESGOTADO) return 'text-[#D97706]';
    return 'text-[#DC2626]';
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-[#0F172A]">
          Repositório de Códigos e Vouchers de Crédito
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Gere códigos resgatáveis com limite de utilizações e validade, ou teste o resgate
          diretamente numa conta.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={`text-sm font-medium ${
            message.type === 'ok' ? 'text-[#16A34A]' : 'text-[#DC2626]'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h3 className="font-display text-base font-bold text-[#0F172A]">
            Gerar Novo Código de Créditos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="v-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Código (opcional, automático se vazio)
              </label>
              <input
                id="v-code"
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="Ex.: PROMO-VERAO-500"
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label htmlFor="v-credits" className="block text-xs font-semibold text-slate-700 mb-1">
                Créditos por Resgate
              </label>
              <input
                id="v-credits"
                type="number"
                min={1}
                max={100000}
                required
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label htmlFor="v-uses" className="block text-xs font-semibold text-slate-700 mb-1">
                Máximo de Resgates
              </label>
              <input
                id="v-uses"
                type="number"
                min={1}
                max={10000}
                required
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label htmlFor="v-exp" className="block text-xs font-semibold text-slate-700 mb-1">
                Válido Até
              </label>
              <input
                id="v-exp"
                type="date"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="v-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição Interna
            </label>
            <input
              id="v-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Ticket className="w-4 h-4" aria-hidden="true" />
            Gerar Código no Repositório
          </button>
        </form>

        <form
          onSubmit={handleRedeem}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Resgatar Código de Créditos
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Valida o estado e o limite do voucher no servidor antes de creditar o saldo da conta.
            </p>

            <div>
              <label htmlFor="r-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Código do Voucher
              </label>
              <input
                id="r-code"
                type="text"
                required
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label
                htmlFor="r-account"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Conta Beneficiária
              </label>
              <select
                id="r-account"
                value={redeemAccountId}
                onChange={(e) => setRedeemAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance.toLocaleString('pt-PT')} créd.)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 text-sm font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            Validar e Creditar Conta
          </button>
        </form>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5">Código</th>
                <th className="py-3 px-5 text-right">Créditos</th>
                <th className="py-3 px-5 text-right">Utilizações</th>
                <th className="py-3 px-5">Validade</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5 text-right">Copiar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-5">
                    <p className="font-mono text-xs font-semibold text-[#0F172A]">{v.code}</p>
                    <p className="text-xs text-slate-500">{v.note}</p>
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-medium text-[#0F172A] tabular-nums">
                    +{v.credits.toLocaleString('pt-PT')}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {v.usedCount} / {v.maxUses}
                  </td>
                  <td className="py-3 px-5 font-mono text-xs text-slate-600 tabular-nums">
                    {v.expiresAt}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`text-xs font-semibold ${statusColor(v.status)}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(v.id, v.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      {copiedId === v.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#16A34A]" aria-hidden="true" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          Copiar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
