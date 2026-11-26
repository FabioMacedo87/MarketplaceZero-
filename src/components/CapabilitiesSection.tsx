import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';

export const CapabilitiesSection: React.FC = () => {
  const [avatarError, setAvatarError] = useState(false);

  return (
    <section id="capacidades" className="py-16 lg:py-20 bg-[#FAFAFA] border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] text-balance">
            Do script manual na pasta local à operação comercial recorrente
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            O ficheiro original executa{' '}
            <code className="font-mono text-xs bg-slate-200/70 px-1.5 py-0.5 rounded text-[#0F172A]">
              PUBLICAR-CORRECAO.ps1
            </code>{' '}
            sem registo, sem controlo de erros e sem proteção contra falhas. O PublicaFix resolve
            cada lacuna operacional e adiciona faturação mensal pronta para clientes.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7">
            <p className="text-xs font-medium text-slate-500">01. Segurança e Integridade</p>
            <h3 className="font-display text-xl font-semibold text-[#0F172A] mt-2">
              Fim do ExecutionPolicy Bypass e de falhas silenciosas
            </h3>
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-[65ch]">
              Cada script submetido é auditado automaticamente: substituímos políticas permissivas
              por execução <span className="font-mono text-xs text-[#0F172A]">RemoteSigned</span>,
              propagamos códigos de saída{' '}
              <span className="font-mono text-xs text-[#0F172A]">%ERRORLEVEL%</span> e gravamos
              transcrições datadas para auditoria técnica.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-7">
            <p className="text-xs font-medium text-slate-500">02. Continuidade</p>
            <h3 className="font-display text-xl font-semibold text-[#0F172A] mt-2">
              Snapshot antes de aplicar
            </h3>
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
              Antes de correr a correção, o módulo guarda o estado anterior. Se o código de saída
              for diferente de zero, a reversão inicia automaticamente.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-7">
            <p className="text-xs font-medium text-slate-500">03. Automação CI/CD</p>
            <h3 className="font-display text-xl font-semibold text-[#0F172A] mt-2">
              Sem bloqueio no comando pause
            </h3>
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
              O comando <span className="font-mono text-xs text-[#0F172A]">pause</span> passa a
              respeitar o modo não interativo, permitindo agendamentos noturnos e deploys remotos.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7">
            <p className="text-xs font-medium text-slate-500">04. Modelo de Negócio SaaS</p>
            <h3 className="font-display text-xl font-semibold text-[#0F172A] mt-2">
              Subscrição mensal com quotas, faturas e portal de cliente
            </h3>
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-[65ch]">
              Lance o seu serviço com planos mensais ou anuais em EUR e BRL, controlo automático de
              quotas de publicação por equipa, emissão imediata de faturas com IVA e gestão de
              renovações diretamente na consola.
            </p>
          </div>
        </div>

        <div className="mt-10 bg-white border border-slate-200 rounded-xl p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
              {!avatarError ? (
                <img
                  src="/src/assets/images/avatar_engineer_1795713728285.jpg"
                  alt="Retrato de Tiago Mendes, Diretor de Engenharia"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCheck className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-[#0F172A] leading-relaxed">
                “Antes enviávamos ficheiros .cmd por pasta partilhada e perdíamos tempo a diagnosticar
                erros sem log. Ao migrar para o PublicaFix, passámos de 42 minutos de validação
                manual para 11 segundos por correção e centralizámos a faturação mensal dos nossos
                clientes.”
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Tiago Mendes · Diretor de Engenharia, Lusitana Sistemas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 shrink-0 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-200">
            <div>
              <p className="font-mono text-xl font-medium text-[#0F172A] tabular-nums">-96%</p>
              <p className="text-xs text-slate-500 mt-0.5">Tempo por publicação</p>
            </div>
            <div>
              <p className="font-mono text-xl font-medium text-[#0F172A] tabular-nums">0 falhas</p>
              <p className="text-xs text-slate-500 mt-0.5">Sem reversão em 6 meses</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
