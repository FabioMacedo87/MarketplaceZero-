import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, Play, Upload } from 'lucide-react';
import { FindingSeverity, type ScriptAuditResult } from '../types.ts';
import { ORIGINAL_ATTACHED_CMD, analyzeAndModernizeScript } from '../utils/scriptAudit.ts';

interface ScriptModernizerProps {
  initialFilename?: string;
  initialContent?: string;
  onUseInConsole: (filename: string, audit: ScriptAuditResult) => void;
  compact?: boolean;
}

export const ScriptModernizer: React.FC<ScriptModernizerProps> = ({
  initialFilename = 'INICIAR-CORRECAO_5576a76e.cmd',
  initialContent = ORIGINAL_ATTACHED_CMD,
  onUseInConsole,
  compact = false,
}) => {
  const [filename, setFilename] = useState(initialFilename);
  const [sourceCode, setSourceCode] = useState(initialContent);
  const [audit, setAudit] = useState<ScriptAuditResult>(() =>
    analyzeAndModernizeScript(initialFilename, initialContent),
  );
  const [activeTab, setActiveTab] = useState<'cmd' | 'ps1' | 'original'>('cmd');
  const [copied, setCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (nextName = filename, nextCode = sourceCode) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/audit-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: nextName, content: nextCode }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.audit) {
          setAudit(data.audit);
          return;
        }
      }
      setAudit(analyzeAndModernizeScript(nextName, nextCode));
    } catch {
      setAudit(analyzeAndModernizeScript(nextName, nextCode));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (text.trim().length > 0) {
        setFilename(file.name);
        setSourceCode(text);
        void handleAnalyze(file.name, text);
      }
    };
    reader.readAsText(file);
  };

  const displayedOutput =
    activeTab === 'cmd'
      ? audit.hardenedCmd
      : activeTab === 'ps1'
        ? audit.hardenedPs1
        : sourceCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownload = (ext: 'cmd' | 'ps1') => {
    const content = ext === 'cmd' ? audit.hardenedCmd : audit.hardenedPs1;
    const downloadName = ext === 'cmd' ? 'INICIAR-CORRECAO-SEGURO.cmd' : 'PUBLICAR-CORRECAO.ps1';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const getSeverityStyle = (severity: FindingSeverity) => {
    if (severity === FindingSeverity.CRITICO) return 'text-[#DC2626]';
    if (severity === FindingSeverity.ATENCAO) return 'text-[#D97706]';
    return 'text-[#1D4ED8]';
  };

  return (
    <section
      id={compact ? undefined : 'modernizador'}
      className={compact ? '' : 'py-16 lg:py-20 bg-white border-b border-slate-200'}
    >
      <div className={compact ? '' : 'max-w-[1200px] mx-auto px-6'}>
        {!compact && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] text-balance">
                Modernizador interativo de scripts de correção
              </h2>
              <p className="mt-2.5 text-base text-slate-600">
                O seu ficheiro <span className="font-mono text-sm text-[#0F172A]">{filename}</span>{' '}
                já está carregado abaixo. Analise vulnerabilidades, gere a versão endurecida e
                descarregue o pacote pronto para produção.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F172A] bg-slate-100 hover:bg-slate-200/80 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-4 h-4" aria-hidden="true" />
              Carregar outro .cmd ou .ps1
              <input
                type="file"
                accept=".cmd,.bat,.ps1,.txt"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left column: Input editor & findings */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-[#FAFAFA] border border-slate-200 rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs font-medium text-[#0F172A] truncate">
                    {filename}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] rounded-md hover:bg-[#1E40AF] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  {isAnalyzing ? 'A analisar...' : 'Analisar Script'}
                </button>
              </div>
              <textarea
                aria-label="Código fonte do script original"
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                rows={7}
                spellCheck={false}
                className="w-full font-mono text-xs leading-relaxed text-[#0F172A] bg-white border border-slate-200 rounded-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Diagnóstico do Script Original
                </h3>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  {audit.checksPassed} / {audit.totalChecks} verificações aprovadas
                </span>
              </div>

              {audit.findings.length === 0 ? (
                <p className="mt-4 text-sm text-[#16A34A] font-medium">
                  Todas as 6 verificações de segurança e automação foram aprovadas.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 mt-1">
                  {audit.findings.map((finding) => (
                    <li key={finding.id} className="py-3.5 first:pt-3 last:pb-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold ${getSeverityStyle(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-500">{finding.lineRef}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{finding.title}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {finding.remediation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: Hardened output */}
          <div className="lg:col-span-7 bg-[#0F172A] text-slate-100 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('cmd')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'cmd'
                      ? 'bg-white text-[#0F172A]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  INICIAR-CORRECAO.cmd
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ps1')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'ps1'
                      ? 'bg-white text-[#0F172A]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  PUBLICAR-CORRECAO.ps1
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('original')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'original'
                      ? 'bg-white text-[#0F172A]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Original
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copiar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(activeTab === 'ps1' ? 'ps1' : 'cmd')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Descarregar
                </button>
              </div>
            </div>

            <pre className="p-5 font-mono text-xs leading-relaxed text-slate-200 overflow-x-auto flex-1">
              <code>{displayedOutput}</code>
            </pre>

            <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-300">
                Pronto para publicar com validação SHA-256, snapshot automático e log persistente.
              </p>
              <button
                type="button"
                onClick={() => onUseInConsole(filename, audit)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Executar na Consola
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
