import React, { useState } from 'react';
import {
  CreditCard,
  FileCode2,
  FileText,
  Layers,
  Play,
  RotateCcw,
  Search,
  Settings,
  Terminal,
} from 'lucide-react';
import { PLANS, formatCurrency, getPlanPrice } from '../data/plans.ts';
import {
  BillingCycle,
  PlanId,
  ReleaseStatus,
  type InvoiceRecord,
  type ReleaseRecord,
  type ScriptAuditResult,
  type SubscriptionState,
  type TeamSettings,
} from '../types.ts';
import { ScriptModernizer } from './ScriptModernizer.tsx';

type ConsoleTab = 'releases' | 'modernizer' | 'billing' | 'settings';

interface SaasConsoleProps {
  subscription: SubscriptionState;
  invoices: InvoiceRecord[];
  releases: ReleaseRecord[];
  settings: TeamSettings;
  activeScriptName: string;
  activeScriptContent: string;
  bannerMessage: string | null;
  onDismissBanner: () => void;
  onUpdateReleases: (releases: ReleaseRecord[]) => void;
  onUpdateSubscription: (sub: SubscriptionState) => void;
  onUpdateSettings: (settings: TeamSettings) => void;
  onOpenPlanChange: (planId: PlanId) => void;
}

export const SaasConsole: React.FC<SaasConsoleProps> = ({
  subscription,
  invoices,
  releases,
  settings,
  activeScriptName,
  activeScriptContent,
  bannerMessage,
  onDismissBanner,
  onUpdateReleases,
  onUpdateSubscription,
  onUpdateSettings,
  onOpenPlanChange,
}) => {
  const [tab, setTab] = useState<ConsoleTab>('releases');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | ReleaseStatus>('Todas');
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(releases[0]?.id ?? '');
  const [showNewReleaseForm, setShowNewReleaseForm] = useState(false);

  // New release form state
  const [newTitle, setNewTitle] = useState('Correção Serviço Faturação #419');
  const [newEnv, setNewEnv] = useState<'Pré-Produção' | 'Produção' | 'Homologação'>('Pré-Produção');
  const [newScript, setNewScript] = useState(activeScriptName);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [releaseError, setReleaseError] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<TeamSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  // Invoice preview state
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);

  const activePlan = PLANS.find((p) => p.id === subscription.planId) ?? PLANS[1];
  const quotaPct = activePlan.monthlyQuota
    ? Math.min(100, Math.round((subscription.usedQuotaThisMonth / activePlan.monthlyQuota) * 100))
    : 12;

  const filteredReleases = releases.filter((rel) => {
    const matchesStatus = statusFilter === 'Todas' || rel.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      rel.title.toLowerCase().includes(q) ||
      rel.scriptName.toLowerCase().includes(q) ||
      rel.operator.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const selectedRelease =
    releases.find((r) => r.id === selectedReleaseId) ?? filteredReleases[0] ?? null;

  const handleRunRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setReleaseError('');
    setIsDeploying(true);

    try {
      const response = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          scriptName: newScript,
          environment: newEnv,
          simulateFailure,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReleaseError(data.error || 'Erro ao executar publicação.');
        return;
      }
      onUpdateReleases([data.release, ...releases]);
      onUpdateSubscription(data.subscription);
      setSelectedReleaseId(data.release.id);
      setShowNewReleaseForm(false);
    } catch {
      setReleaseError('Falha de comunicação com o servidor de publicação.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async (releaseId: string) => {
    setReleaseError('');
    try {
      const response = await fetch(`/api/releases/${releaseId}/rollback`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        setReleaseError(data.error || 'Não foi possível reverter.');
        return;
      }
      onUpdateReleases(releases.map((r) => (r.id === releaseId ? data.release : r)));
    } catch {
      setReleaseError('Erro de ligação ao reverter publicação.');
    }
  };

  const handleToggleAutoRenew = async () => {
    const nextVal = !subscription.autoRenew;
    try {
      const response = await fetch('/api/subscriptions/toggle-renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: nextVal }),
      });
      if (response.ok) {
        const data = await response.json();
        onUpdateSubscription(data.subscription);
        return;
      }
    } catch {
      // fallback
    }
    onUpdateSubscription({ ...subscription, autoRenew: nextVal });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMsg('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      if (response.ok) {
        const data = await response.json();
        onUpdateSettings(data.settings);
      } else {
        onUpdateSettings(settingsForm);
      }
    } catch {
      onUpdateSettings(settingsForm);
    }
    setSettingsSavedMsg('Definições guardadas.');
    setTimeout(() => setSettingsSavedMsg(''), 2500);
  };

  const handleModernizerToConsole = (filename: string, _audit: ScriptAuditResult) => {
    setNewScript(filename);
    setTab('releases');
    setShowNewReleaseForm(true);
  };

  const getStatusClass = (status: ReleaseStatus) => {
    if (status === ReleaseStatus.CONCLUIDA) return 'text-[#16A34A]';
    if (status === ReleaseStatus.REVERTIDA) return 'text-[#D97706]';
    if (status === ReleaseStatus.FALHADA) return 'text-[#DC2626]';
    return 'text-[#1D4ED8]';
  };

  const navItems: { id: ConsoleTab; label: string; icon: React.ReactNode }[] = [
    { id: 'releases', label: 'Publicações', icon: <Layers className="w-4 h-4" /> },
    { id: 'modernizer', label: 'Modernizador', icon: <FileCode2 className="w-4 h-4" /> },
    { id: 'billing', label: 'Mensalidade e Faturas', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'settings', label: 'Definições da Equipa', icon: <Settings className="w-4 h-4" /> },
  ];

  const tabTitles: Record<ConsoleTab, string> = {
    releases: 'Publicações e Correções',
    modernizer: 'Modernizador de Scripts',
    billing: 'Mensalidade e Faturação',
    settings: 'Definições da Equipa',
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAFAFA] flex flex-col lg:flex-row">
      {/* Sidebar 256px */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="p-4">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-slate-500">Espaço de Trabalho</p>
            <p className="text-sm font-semibold text-[#0F172A] truncate mt-0.5">
              {subscription.workspaceName}
            </p>
          </div>

          <nav aria-label="Menu da consola" className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Plano {activePlan.name}</span>
            <span className="font-mono tabular-nums">
              {activePlan.monthlyQuota
                ? `${subscription.usedQuotaThisMonth}/${activePlan.monthlyQuota}`
                : `${subscription.usedQuotaThisMonth} pub.`}
            </span>
          </div>
          {activePlan.monthlyQuota && (
            <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1D4ED8] rounded-full"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          )}
          <div className="mt-4 flex items-center gap-2.5">
            <img
              src="/src/assets/images/avatar_engineer_1795713728285.jpg"
              alt="Perfil do operador"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#0F172A] truncate">
                {subscription.billingEmail}
              </p>
              <p className="text-[11px] text-slate-500">
                {subscription.autoRenew ? 'Mensalidade ativa' : 'Renovação suspensa'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1160px]">
        {/* Top contextual breadcrumb bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">
              Consola <span aria-hidden="true">/</span> {tabTitles[tab]}
            </p>
            <h1 className="font-display text-2xl font-bold text-[#0F172A] mt-1">
              {tabTitles[tab]}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {tab === 'releases' && (
              <button
                type="button"
                onClick={() => setShowNewReleaseForm(!showNewReleaseForm)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                {showNewReleaseForm ? 'Fechar Formulário' : 'Nova Publicação'}
              </button>
            )}
            {tab === 'billing' && (
              <button
                type="button"
                onClick={() => onOpenPlanChange(subscription.planId)}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Alterar Plano Mensal
              </button>
            )}
          </div>
        </div>

        {bannerMessage && (
          <div className="mt-5 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[#16A34A]">{bannerMessage}</p>
            <button
              type="button"
              onClick={onDismissBanner}
              className="text-xs font-medium text-slate-500 hover:text-[#0F172A] cursor-pointer"
            >
              Dispensar
            </button>
          </div>
        )}

        {releaseError && (
          <div role="alert" className="mt-5 p-4 bg-white border border-[#DC2626]/40 rounded-xl">
            <p className="text-sm font-medium text-[#DC2626]">{releaseError}</p>
          </div>
        )}

        {/* TAB 1: RELEASES */}
        {tab === 'releases' && (
          <div className="mt-6 space-y-6">
            {showNewReleaseForm && (
              <form
                onSubmit={handleRunRelease}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  Executar Nova Publicação Controlada
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="rel-title"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Descrição da Correção
                    </label>
                    <input
                      id="rel-title"
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="rel-script"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Script Associado
                    </label>
                    <input
                      id="rel-script"
                      type="text"
                      required
                      value={newScript}
                      onChange={(e) => setNewScript(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="rel-env"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Ambiente Alvo
                    </label>
                    <select
                      id="rel-env"
                      value={newEnv}
                      onChange={(e) =>
                        setNewEnv(e.target.value as 'Pré-Produção' | 'Produção' | 'Homologação')
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
                    >
                      <option value="Pré-Produção">Pré-Produção</option>
                      <option value="Homologação">Homologação</option>
                      <option value="Produção">Produção</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="rounded border-slate-300 text-[#1D4ED8]"
                    />
                    Simular erro na etapa PowerShell para testar reversão automática
                  </label>

                  <button
                    type="submit"
                    disabled={isDeploying}
                    className="px-5 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isDeploying ? 'A publicar...' : 'Iniciar Pipeline de Publicação'}
                  </button>
                </div>
              </form>
            )}

            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Quota Utilizada (Mês Atual)</p>
                <p className="font-mono text-2xl font-medium text-[#0F172A] mt-1 tabular-nums">
                  {subscription.usedQuotaThisMonth}
                  <span className="text-sm text-slate-500">
                    {activePlan.monthlyQuota ? ` / ${activePlan.monthlyQuota}` : ' / Ilimitado'}
                  </span>
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Total de Publicações Registadas</p>
                <p className="font-mono text-2xl font-medium text-[#0F172A] mt-1 tabular-nums">
                  {releases.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">Próxima Faturação</p>
                <p className="font-mono text-2xl font-medium text-[#0F172A] mt-1 tabular-nums">
                  {subscription.nextBillingDate}
                </p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Procurar correção, script ou operador..."
                  aria-label="Procurar publicações"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                {(['Todas', ReleaseStatus.CONCLUIDA, ReleaseStatus.REVERTIDA] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        statusFilter === status
                          ? 'bg-white text-[#0F172A]'
                          : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Table + Inspector */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {filteredReleases.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    Nenhuma publicação corresponde ao filtro atual.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ajuste a pesquisa ou execute uma nova publicação controlada.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('Todas');
                    }}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-[#1D4ED8] bg-[#1D4ED8]/10 rounded-lg cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-5">Correção</th>
                        <th className="py-3 px-5">Ambiente</th>
                        <th className="py-3 px-5">Data</th>
                        <th className="py-3 px-5 text-right">Duração</th>
                        <th className="py-3 px-5">Estado</th>
                        <th className="py-3 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredReleases.map((rel) => {
                        const isSelected = selectedRelease?.id === rel.id;
                        return (
                          <tr
                            key={rel.id}
                            onClick={() => setSelectedReleaseId(rel.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#1D4ED8]/5' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-5">
                              <p className="font-medium text-[#0F172A]">{rel.title}</p>
                              <p className="font-mono text-xs text-slate-500">{rel.scriptName}</p>
                            </td>
                            <td className="py-3 px-5 text-slate-600">{rel.environment}</td>
                            <td className="py-3 px-5 font-mono text-xs text-slate-600 tabular-nums">
                              {rel.createdAt}
                            </td>
                            <td className="py-3 px-5 text-right font-mono text-xs text-slate-600 tabular-nums">
                              {rel.durationSec.toFixed(1)} s
                            </td>
                            <td className="py-3 px-5">
                              <span className={`text-xs font-semibold ${getStatusClass(rel.status)}`}>
                                {rel.status}
                              </span>
                            </td>
                            <td
                              className="py-3 px-5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {rel.status === ReleaseStatus.CONCLUIDA && (
                                <button
                                  type="button"
                                  onClick={() => handleRollback(rel.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                  Reverter
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Release Step & Log Inspector */}
            {selectedRelease && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">
                      Registo de Execução · SHA-256:{' '}
                      <span className="font-mono text-[#0F172A]">{selectedRelease.checksum}</span>
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#0F172A] mt-0.5">
                      {selectedRelease.title}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-600 tabular-nums">
                    Código de saída: {selectedRelease.exitCode}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedRelease.steps.map((step) => (
                    <div key={step.name} className="p-3.5 bg-[#FAFAFA] border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            step.status === 'Falhada' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                          }`}
                        >
                          {step.status}
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {step.durationMs} ms
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A] mt-1.5">{step.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 bg-[#0F172A] rounded-lg p-4 text-slate-200 font-mono text-xs space-y-1.5 overflow-x-auto">
                  <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-slate-800 mb-2">
                    <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Transcrição persistente da execução</span>
                  </div>
                  {selectedRelease.logs.map((line, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MODERNIZER */}
        {tab === 'modernizer' && (
          <div className="mt-6">
            <ScriptModernizer
              compact
              initialFilename={activeScriptName}
              initialContent={activeScriptContent}
              onUseInConsole={handleModernizerToConsole}
            />
          </div>
        )}

        {/* TAB 3: BILLING & INVOICES */}
        {tab === 'billing' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Subscrição Atual</span>
                    <span className="font-semibold text-[#16A34A]">
                      {subscription.autoRenew ? 'Ativa' : 'Cancela no fim do ciclo'}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#0F172A] mt-2">
                    Plano {activePlan.name}
                  </h2>
                  <p className="font-mono text-xl font-medium text-[#0F172A] mt-1 tabular-nums">
                    {formatCurrency(
                      getPlanPrice(activePlan, subscription.cycle, subscription.currency),
                      subscription.currency,
                    )}{' '}
                    <span className="text-xs font-sans text-slate-500">
                      / mês ({subscription.cycle === BillingCycle.ANNUAL ? 'faturação anual' : 'mensal'})
                    </span>
                  </p>
                  <p className="mt-3 text-xs text-slate-600">
                    Método: <span className="font-medium text-[#0F172A]">{subscription.paymentMethod}</span>{' '}
                    · Próxima cobrança:{' '}
                    <span className="font-mono tabular-nums">{subscription.nextBillingDate}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenPlanChange(PlanId.EMPRESARIAL)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Atualizar Plano
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleAutoRenew}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {subscription.autoRenew ? 'Cancelar Renovação Automática' : 'Reativar Renovação'}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <p className="text-xs text-slate-500">Consumo de Mensalidade</p>
                <h3 className="font-display text-lg font-bold text-[#0F172A] mt-2">
                  Quota de Publicações
                </h3>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
                  {subscription.usedQuotaThisMonth}
                  <span className="text-sm text-slate-500">
                    {activePlan.monthlyQuota ? ` de ${activePlan.monthlyQuota} incluídas` : ' (ilimitado)'}
                  </span>
                </p>
                {activePlan.monthlyQuota && (
                  <div className="mt-4 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D4ED8] rounded-full"
                      style={{ width: `${quotaPct}%` }}
                    />
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                  Dados fiscais: <span className="font-medium">{subscription.workspaceName}</span>
                  {subscription.taxId ? ` · NIF/NIPC ${subscription.taxId}` : ''} ·{' '}
                  {subscription.billingEmail}
                </p>
              </div>
            </div>

            {/* Invoices table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-display text-base font-bold text-[#0F172A]">
                  Histórico de Faturas Emitidas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-6">Fatura</th>
                      <th className="py-3 px-6">Data</th>
                      <th className="py-3 px-6">Plano</th>
                      <th className="py-3 px-6 text-right">Total c/ IVA</th>
                      <th className="py-3 px-6">Estado</th>
                      <th className="py-3 px-6 text-right">Recibo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-6 font-mono text-xs font-medium text-[#0F172A]">
                          {inv.number}
                        </td>
                        <td className="py-3 px-6 font-mono text-xs text-slate-600 tabular-nums">
                          {inv.issuedAt}
                        </td>
                        <td className="py-3 px-6 text-slate-700">{inv.planName}</td>
                        <td className="py-3 px-6 text-right font-mono font-medium text-[#0F172A] tabular-nums">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="py-3 px-6 text-xs font-semibold text-[#16A34A]">
                          {inv.status}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {previewInvoice && (
              <div className="bg-white border border-slate-300 rounded-xl p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Documento de Quitação</p>
                    <h4 className="font-display text-lg font-bold text-[#0F172A]">
                      Fatura {previewInvoice.number}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(null)}
                    className="text-xs font-semibold text-slate-600 hover:text-[#0F172A] cursor-pointer"
                  >
                    Fechar Recibo
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Cliente</p>
                    <p className="font-semibold text-[#0F172A]">{subscription.workspaceName}</p>
                    <p className="text-xs text-slate-600">{subscription.billingEmail}</p>
                    {subscription.taxId && (
                      <p className="text-xs font-mono text-slate-600">NIF: {subscription.taxId}</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-slate-500">Resumo Financeiro</p>
                    <p className="font-mono text-xs text-slate-600 tabular-nums">
                      Subtotal: {formatCurrency(previewInvoice.subtotal, previewInvoice.currency)}
                    </p>
                    <p className="font-mono text-xs text-slate-600 tabular-nums">
                      IVA: {formatCurrency(previewInvoice.vatAmount, previewInvoice.currency)}
                    </p>
                    <p className="font-mono text-base font-bold text-[#0F172A] mt-1 tabular-nums">
                      Total Pago: {formatCurrency(previewInvoice.total, previewInvoice.currency)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {tab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="mt-6 bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5"
          >
            <div>
              <label
                htmlFor="set-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email de Alertas de Publicação
              </label>
              <input
                id="set-email"
                type="email"
                required
                value={settingsForm.notificationEmail}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, notificationEmail: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label
                htmlFor="set-webhook"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Webhook de Notificação (Slack / Teams / ERP)
              </label>
              <input
                id="set-webhook"
                type="url"
                value={settingsForm.webhookUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, webhookUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 text-sm text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.requireProdConfirmation}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      requireProdConfirmation: e.target.checked,
                    })
                  }
                  className="mt-1 rounded border-slate-300 text-[#1D4ED8]"
                />
                <span>
                  <span className="font-semibold block">
                    Exigir validação de assinatura SHA-256 em Produção
                  </span>
                  <span className="text-xs text-slate-600">
                    Bloqueia scripts que utilizem -ExecutionPolicy Bypass sem aprovação.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.autoRollbackOnFailure}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      autoRollbackOnFailure: e.target.checked,
                    })
                  }
                  className="mt-1 rounded border-slate-300 text-[#1D4ED8]"
                />
                <span>
                  <span className="font-semibold block">
                    Reverter automaticamente em caso de erro PowerShell
                  </span>
                  <span className="text-xs text-slate-600">
                    Restaura o snapshot prévio sempre que o código de saída for diferente de 0.
                  </span>
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              {settingsSavedMsg ? (
                <p className="text-xs font-semibold text-[#16A34A]">{settingsSavedMsg}</p>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Guardar Definições
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
