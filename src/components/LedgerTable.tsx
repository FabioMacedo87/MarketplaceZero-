import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { LedgerEntry } from '../types.ts';

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ entries }) => {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');

  const filtered = entries.filter((entry) => {
    const matchesDir =
      direction === 'all' || (direction === 'in' ? entry.delta > 0 : entry.delta < 0);
    const q = query.trim().toLowerCase();
    const matchesQ =
      q === '' ||
      entry.accountName.toLowerCase().includes(q) ||
      entry.reference.toLowerCase().includes(q) ||
      entry.type.toLowerCase().includes(q);
    return matchesDir && matchesQ;
  });

  const handleExportCsv = () => {
    const header = 'ID,Conta,Tipo,Variacao,SaldoAnterior,SaldoAtual,Referencia,Data\n';
    const rows = filtered
      .map((e) =>
        [
          e.id,
          `"${e.accountName.replace(/"/g, '""')}"`,
          `"${e.type}"`,
          e.delta,
          e.balanceBefore,
          e.balanceAfter,
          `"${e.reference.replace(/"/g, '""')}"`,
          e.createdAt,
        ].join(','),
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registo-creditos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F172A]">
            Registo Auditável de Créditos
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Histórico completo de emissões, resgates de vouchers, compras Stripe e consumos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por conta, tipo ou referência..."
            aria-label="Filtrar movimentos de créditos"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'in', label: 'Entradas (+)' },
              { id: 'out', label: 'Consumos (-)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDirection(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                direction === item.id
                  ? 'bg-white text-[#0F172A]'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum movimento encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">Conta</th>
                  <th className="py-3 px-5">Tipo e Referência</th>
                  <th className="py-3 px-5 text-right">Variação</th>
                  <th className="py-3 px-5 text-right">Saldo Final</th>
                  <th className="py-3 px-5 text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 font-medium text-[#0F172A]">{entry.accountName}</td>
                    <td className="py-3 px-5">
                      <p className="text-xs font-semibold text-[#0F172A]">{entry.type}</p>
                      <p className="text-xs text-slate-500">{entry.reference}</p>
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-mono font-semibold tabular-nums ${
                        entry.delta > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {entry.delta > 0
                        ? `+${entry.delta.toLocaleString('pt-PT')}`
                        : entry.delta.toLocaleString('pt-PT')}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-xs text-[#0F172A] tabular-nums">
                      {entry.balanceAfter.toLocaleString('pt-PT')}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-xs text-slate-500 tabular-nums">
                      {entry.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
