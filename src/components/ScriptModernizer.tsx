import React, { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Download, FileCode2, FileUp, Play } from 'lucide-react';
import { FindingSeverity, type ScriptAuditResult } from '../types.ts';
import { ORIGINAL_ATTACHED_CMD } from '../utils/scriptAudit.ts';
import { supabase } from '../lib/supabase.ts';

interface ScriptModernizerProps {
  initialFilename?: string;
  initialContent?: string;
  onRequireAuth: () => void;
}

const MAX_FILE_BYTES = 32 * 1024;

const emptyAudit = (filename: string): ScriptAuditResult => ({
  filename,
  detectedType: filename.toLowerCase().endsWith('.ps1') ? 'powershell' : 'batch',
  checksPassed: 0,
  totalChecks: 9,
  findings: [],
});

export const ScriptModernizer: React.FC<ScriptModernizerProps> = ({
  initialFilename = 'INICIAR-CORRECAO.cmd',
  initialContent = ORIGINAL_ATTACHED_CMD,
  onRequireAuth,
}) => {
  const [filename, setFilename] = useState(initialFilename);
  const [sourceCode, setSourceCode] = useState(initialContent);
  const [audit, setAudit] = useState<ScriptAuditResult>(() => emptyAudit(initialFilename));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFilename(initialFilename);
    setSourceCode(initialContent);
    setAudit(emptyAudit(initialFilename));
  }, [initialFilename, initialContent]);

  const runAnalysis = async (nextFilename = filename, nextContent = sourceCode) => {
    if (!nextContent.trim()) {
      setMessage('Introduz ou carrega o conteúdo de um script antes de analisar.');
      return;
    }
    if (new TextEncoder().encode(nextContent).length > MAX_FILE_BYTES) {
      setMessage('O limite é 32 KB por ficheiro. Reduz o conteúdo e tenta novamente.');
      return;
    }

    setIsAnalyzing(true);
    setMessage('');
    try {
      if (!supabase) {
        setMessage('A autenticação ainda não está disponível. Inicia sessão para analisar scripts.');
        onRequireAuth();
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setMessage('Inicia sessão ou cria uma conta gratuita para utilizar as análises.');
        onRequireAuth();
        return;
      }

      const response = await fetch('/api/audit-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ filename: nextFilename, content: nextContent }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setMessage('A tua sessão expirou. Inicia sessão novamente para continuar.');
          onRequireAuth();
          return;
        }
        throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível concluir a análise.');
      }
      if (!data.audit) throw new Error('Resposta de análise inválida.');
      setAudit(data.audit as ScriptAuditResult);
      const usage = data.usage;
      setMessage(
        usage && typeof usage.used === 'number' && typeof usage.limit === 'number'
          ? 'Análise concluída. Utilizações este mês: ' + usage.used + ' de ' + usage.limit + '. O conteúdo não foi guardado nem executado.'
          : 'Análise concluída. O conteúdo não foi guardado nem executado.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a análise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(cmd|bat|ps1)$/i.test(file.name)) {
      setMessage('Formato não suportado. Escolhe um ficheiro .cmd, .bat ou .ps1.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage('O ficheiro excede o limite de 32 KB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        setMessage('O ficheiro está vazio ou não contém texto legível.');
        return;
      }
      setFilename(file.name);
      setSourceCode(text);
      void runAnalysis(file.name, text);
    };
    reader.onerror = () => setMessage('Não foi possível ler o ficheiro selecionado.');
    reader.readAsText(file);
  };

  const buildReport = () => {
    const lines = [
      'PUBLICAFIX — RELATÓRIO DE ANÁLISE ESTÁTICA',
      'Ficheiro: ' + audit.filename,
      'Tipo detetado: ' + (audit.detectedType === 'powershell' ? 'PowerShell' : 'Windows Batch'),
      'Verificações sem achados: ' + audit.checksPassed + '/' + audit.totalChecks,
      'Achados: ' + audit.findings.length,
      'Data do relatório: ' + new Date().toLocaleString('pt-PT'),
      '',
    ];
    if (audit.findings.length === 0) {
      lines.push('Não foram encontrados os padrões abrangidos pelas verificações desta versão.');
    } else {
      audit.findings.forEach((finding, index) => {
        lines.push(
          (index + 1) + '. [' + finding.severity + '] ' + finding.title,
          '   Referência: ' + finding.lineRef,
          '   Observação: ' + finding.description,
          '   Recomendação: ' + finding.remediation,
          '',
        );
      });
    }
    lines.push(
      'LIMITAÇÕES',
      'Esta é uma análise estática heurística. Pode produzir falsos positivos ou não detetar problemas.',
      'Não constitui certificação de segurança nem substitui uma revisão técnica.',
      'O PublicaFix não executa, assina, publica ou reverte o script.',
    );
    return lines.join('\n');
  };

  const downloadReport = () => {
    const blob = new Blob([buildReport()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = audit.filename.replace(/\.[^.]+$/, '') + '-publicafix-report.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage('Não foi possível copiar o relatório neste navegador. Usa a opção de descarregar.');
    }
  };

  const getSeverityStyle = (severity: FindingSeverity) => {
    if (severity === FindingSeverity.CRITICO) return 'text-red-700 bg-red-50';
    if (severity === FindingSeverity.ATENCAO) return 'text-amber-700 bg-amber-50';
    return 'text-blue-700 bg-blue-50';
  };

  return (
    <section id="modernizador" className="py-16 lg:py-20 bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Analisador de scripts</h2>
            <p className="mt-2.5 text-base text-slate-600">Carrega um ficheiro ou cola o código. O limite é 32 KB por análise.</p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
            <FileUp className="w-4 h-4" aria-hidden="true" />
            Carregar .cmd, .bat ou .ps1
            <input type="file" accept=".cmd,.bat,.ps1" onChange={handleFileUpload} className="sr-only" />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-[#FAFAFA] border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span className="font-mono text-xs font-medium text-[#0F172A] truncate">{filename}</span>
              </div>
              <button type="button" onClick={() => void runAnalysis()} disabled={isAnalyzing} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] rounded-md hover:bg-[#1E40AF] disabled:opacity-60">
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                {isAnalyzing ? 'A analisar...' : 'Analisar script'}
              </button>
            </div>
            <textarea aria-label="Conteúdo do script" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} rows={16} spellCheck={false} className="w-full font-mono text-xs leading-relaxed text-[#0F172A] bg-white border border-slate-200 rounded-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]" />
            <div className="flex items-center justify-between gap-3 mt-3 text-xs text-slate-500">
              <span>{new TextEncoder().encode(sourceCode).length.toLocaleString('pt-PT')} / 32 768 bytes</span>
              <span>{sourceCode.split(/\r?\n/).length} linhas</span>
            </div>
            {message && <p role="status" className="mt-3 text-xs text-slate-600">{message}</p>}
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Resultado da análise</h3>
                  <p className="text-xs text-slate-500 mt-1">{audit.checksPassed} de {audit.totalChecks} verificações sem achados</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void copyReport()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />{copied ? 'Copiado' : 'Copiar relatório'}
                  </button>
                  <button type="button" onClick={downloadReport} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md">
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />Descarregar
                  </button>
                </div>
              </div>

              {audit.findings.length === 0 ? (
                <p className="mt-4 text-sm text-emerald-700 font-medium">Não foram encontrados os padrões abrangidos pelas verificações desta versão.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {audit.findings.map((finding) => (
                    <li key={finding.id} className="py-4 first:pt-4 last:pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={'text-xs font-semibold px-2 py-1 rounded ' + getSeverityStyle(finding.severity)}>{finding.severity}</span>
                        <span className="font-mono text-xs text-slate-500">{finding.lineRef}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">{finding.title}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{finding.description}</p>
                      <p className="mt-2 text-xs text-slate-700 leading-relaxed"><strong>Recomendação:</strong> {finding.remediation}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
              <p className="text-xs text-amber-900 leading-relaxed">
                O ficheiro é analisado como texto. O PublicaFix não o executa nem o modifica no teu computador. Revê sempre as recomendações antes de executar qualquer script.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
