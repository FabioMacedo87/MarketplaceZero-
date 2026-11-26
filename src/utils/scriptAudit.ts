import { FindingSeverity, type ScriptAuditResult, type ScriptFinding } from '../types.ts';

export const ORIGINAL_ATTACHED_CMD = [
  '@echo off',
  'cd /d "%~dp0"',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLICAR-CORRECAO.ps1"',
  'echo.',
  'echo Processo terminado. Le o resultado acima.',
  'pause',
].join('\n');

function isCommentLine(line: string): boolean {
  return /^\s*(?:#|REM\b|::)/i.test(line);
}

/**
 * Static, heuristic script inspection only. This function never executes script content.
 * Findings are signals for human review, not proof that a script is safe or malicious.
 */
export function analyzeAndModernizeScript(filename: string, rawContent: string): ScriptAuditResult {
  const cleanName = (filename || 'script.cmd')
    .replace(/^.*[\\/]/, '')
    .trim()
    .slice(0, 80) || 'script.cmd';
  const content = typeof rawContent === 'string' ? rawContent : '';
  const isPowerShell = cleanName.toLowerCase().endsWith('.ps1');
  const rawLines = content.split(/\r?\n/);
  const activeLines = rawLines.filter((line) => !isCommentLine(line));
  const activeText = activeLines.join('\n');
  const findings: ScriptFinding[] = [];

  const add = (
    id: string,
    severity: FindingSeverity,
    expression: RegExp,
    title: string,
    description: string,
    remediation: string,
  ) => {
    if (expression.test(activeText)) {
      findings.push({
        id,
        severity,
        lineRef: lineOf(activeLines, expression),
        title,
        description,
        remediation,
      });
    }
  };

  const lineOf = (lines: string[], expression: RegExp): string => {
    const index = lines.findIndex((line) => expression.test(line));
    return index < 0 ? 'Global' : 'Linha ' + String(index + 1);
  };

  if (/^\s*$/.test(content)) {
    findings.push({
      id: 'empty-script',
      severity: FindingSeverity.ATENCAO,
      lineRef: 'Linha 1',
      title: 'O ficheiro não contém código para analisar',
      description: 'Não foi encontrado conteúdo executável no ficheiro submetido.',
      remediation: 'Carregue um ficheiro .cmd, .bat ou .ps1 com conteúdo e volte a analisar.',
    });
  } else {
    add(
      'exec-policy-bypass',
      FindingSeverity.CRITICO,
      /-ExecutionPolicy\s+(?:Bypass|Unrestricted)\b/i,
      'Política de execução permissiva',
      'Foi encontrado um parâmetro que contorna ou enfraquece a política de execução do PowerShell.',
      'Evite Bypass/Unrestricted. Use uma política aprovada pela organização e valide a origem e assinatura do código.',
    );
    add(
      'blocking-pause',
      FindingSeverity.ATENCAO,
      /^\s*pause\b|^\s*Read-Host\b/i,
      'Pausa interativa',
      'O comando pode bloquear a execução à espera de interação humana, dificultando tarefas agendadas ou pipelines.',
      'Torne a interação opcional e disponibilize um modo não interativo explícito.',
    );

    const exitCodeExpression = isPowerShell
      ? /\$LASTEXITCODE|\bthrow\b|\bexit\s+[1-9]\d*\b/i
      : /%ERRORLEVEL%|%EXIT_CODE%|if\s+errorlevel|exit\s+\/b/i;
    add(
      'missing-exitcode',
      FindingSeverity.CRITICO,
      exitCodeExpression,
      'Tratamento de erros/código de saída a rever',
      'Não foi detetado um padrão comum de propagação de falhas para o processo chamador.',
      isPowerShell
        ? 'Verifique $LASTEXITCODE quando chamar programas externos e devolva um código de saída coerente.'
        : 'Capture %ERRORLEVEL% imediatamente após cada comando crítico e termine com exit /b com esse código.',
    );

    add(
      'missing-preflight-check',
      FindingSeverity.ATENCAO,
      /if\s+not\s+exist|Test-Path|Get-Item\s+-ErrorAction/i,
      'Sem verificação prévia evidente',
      'Não foi detetada uma verificação comum da existência do ficheiro ou caminho necessário antes da operação.',
      'Valide os caminhos, permissões e pré-condições antes de alterar o sistema.',
    );

    add(
      'missing-audit-log',
      FindingSeverity.RECOMENDADO,
      /Start-Transcript|Out-File|Tee-Object|Add-Content|>>\s*["']?[^ \r\n]+/i,
      'Registo de auditoria não detetado',
      'Não foi identificado um mecanismo comum para guardar um registo persistente da operação.',
      'Adicione registos com data/hora, resultado e contexto, evitando guardar palavras-passe ou tokens.',
    );

    const strictErrorExpression = isPowerShell
      ? /\$ErrorActionPreference\s*=\s*['"]Stop['"]|Set-StrictMode/i
      : /setlocal|if\s+errorlevel|if\s+%ERRORLEVEL%/i;
    add(
      'missing-strict-error-mode',
      FindingSeverity.RECOMENDADO,
      strictErrorExpression,
      'Tratamento rigoroso de erros não detetado',
      'Não foi encontrado um padrão comum para tornar as falhas explícitas.',
      isPowerShell
        ? 'Considere $ErrorActionPreference = Stop, Set-StrictMode e blocos try/catch onde fizer sentido.'
        : 'Use setlocal e verifique explicitamente o resultado dos comandos críticos.',
    );

    if (isPowerShell) {
      add(
        'dynamic-code-execution',
        FindingSeverity.CRITICO,
        /\bInvoke-Expression\b|\biex\b/i,
        'Execução dinâmica de texto',
        'Invoke-Expression/iex pode executar texto construído durante a execução e dificulta a auditoria da origem do código.',
        'Evite executar texto como código. Prefira comandos explícitos, parâmetros validados e ficheiros assinados.',
      );
    }

    add(
      'hard-coded-secret',
      FindingSeverity.CRITICO,
      /\b(?:password|passwd|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*['"][^'"]{6,}['"]/i,
      'Possível segredo escrito diretamente no script',
      'Foi detetado um valor com aspeto de palavra-passe, token ou chave definido como texto.',
      'Remova o segredo do ficheiro. Use um gestor de segredos ou variável de ambiente protegida e rode qualquer credencial exposta.',
    );

    add(
      'destructive-command',
      FindingSeverity.ATENCAO,
      /Remove-Item\b[^\r\n]*(?:-Recurse|-Force)|\b(?:rd|rmdir)\s+\/s\b|\bdel\s+\/s\b|\bformat(?:\.com)?\b/i,
      'Comando potencialmente destrutivo',
      'Foi encontrado um comando que pode eliminar muitos ficheiros ou formatar uma unidade.',
      'Confirme o destino, aplique validações explícitas, faça cópias de segurança verificadas e teste primeiro num ambiente isolado.',
    );
  }

  const totalChecks = content.trim() ? 9 : 1;
  return {
    filename: cleanName,
    detectedType: isPowerShell ? 'powershell' : 'batch',
    checksPassed: Math.max(0, totalChecks - findings.length),
    totalChecks,
    findings,
  };
}
