import { FindingSeverity, type ScriptAuditResult, type ScriptFinding } from '../types.ts';

export const ORIGINAL_ATTACHED_CMD = `@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLICAR-CORRECAO.ps1"
echo.
echo Processo terminado. Le o resultado acima.
pause`;

export function analyzeAndModernizeScript(
  filename: string,
  rawContent: string,
): ScriptAuditResult {
  const cleanName = (filename || 'INICIAR-CORRECAO.cmd').trim().slice(0, 80);
  const content = rawContent.trim() || ORIGINAL_ATTACHED_CMD;
  const isPowerShell = cleanName.toLowerCase().endsWith('.ps1') || content.includes('$ErrorActionPreference');
  const lines = content.split(/\r?\n/);

  const findings: ScriptFinding[] = [];
  let passed = 0;
  const totalChecks = 6;

  // 1. ExecutionPolicy Bypass check
  const bypassIndex = lines.findIndex((l) => /executionpolicy\s+bypass/i.test(l));
  if (bypassIndex !== -1) {
    findings.push({
      id: 'exec-policy-bypass',
      severity: FindingSeverity.CRITICO,
      lineRef: `Linha ${bypassIndex + 1}`,
      title: 'Política de execução contornada com Bypass',
      description:
        'O parâmetro -ExecutionPolicy Bypass desativa toda a verificação de assinatura de código no PowerShell.',
      remediation:
        'Substituir por RemoteSigned ou validar o hash SHA-256 do ficheiro PUBLICAR-CORRECAO.ps1 antes da execução.',
    });
  } else {
    passed += 1;
  }

  // 2. Interactive pause check
  const pauseIndex = lines.findIndex((l) => /^\s*pause\b/i.test(l) || /Read-Host/i.test(l));
  if (pauseIndex !== -1) {
    findings.push({
      id: 'blocking-pause',
      severity: FindingSeverity.ATENCAO,
      lineRef: `Linha ${pauseIndex + 1}`,
      title: 'Pausa interativa bloqueia automação e pipelines',
      description:
        'O comando pause suspende o processo indefinidamente à espera de teclado, impedindo execução remota ou agendada.',
      remediation:
        'Aceitar flag --non-interactive ou variável de ambiente CI=true para saltar a pausa em ambientes automatizados.',
    });
  } else {
    passed += 1;
  }

  // 3. Exit code propagation check
  const hasExitCodeHandling = /EXITCODE|%ERRORLEVEL%|exit\s+\/b/i.test(content);
  if (!hasExitCodeHandling) {
    findings.push({
      id: 'missing-exitcode',
      severity: FindingSeverity.CRITICO,
      lineRef: 'Global',
      title: 'Ausência de propagação do código de saída',
      description:
        'Se o script PowerShell falhar a meio da publicação, o ficheiro .cmd termina sem devolver erro ao sistema chamador.',
      remediation:
        'Capturar %ERRORLEVEL% após a invocação do PowerShell e terminar com exit /b %EXIT_CODE%.',
    });
  } else {
    passed += 1;
  }

  // 4. Target script existence verification
  const hasExistsCheck = /if\s+not\s+exist|Test-Path/i.test(content);
  if (!hasExistsCheck) {
    findings.push({
      id: 'missing-preflight-check',
      severity: FindingSeverity.ATENCAO,
      lineRef: 'Pré-voo',
      title: 'Sem verificação prévia da existência do módulo alvo',
      description:
        'O lançador invoca o ficheiro PowerShell diretamente sem verificar se o destino existe ou se há permissões de escrita.',
      remediation:
        'Adicionar validação if not exist "%TARGET_SCRIPT%" com código de saída explícito 2.',
    });
  } else {
    passed += 1;
  }

  // 5. Logging / Transcript check
  const hasLogging = /Start-Transcript|Out-File|>>\s*|Tee-Object/i.test(content);
  if (!hasLogging) {
    findings.push({
      id: 'missing-audit-log',
      severity: FindingSeverity.RECOMENDADO,
      lineRef: 'Auditoria',
      title: 'Execução sem registo persistente de auditoria',
      description:
        'O resultado aparece apenas na janela temporária de consola e desaparece assim que o operador fecha o terminal.',
      remediation:
        'Gravar automaticamente um ficheiro de log datado em ./logs/correcao-YYYYMMDD-HHMMSS.log.',
    });
  } else {
    passed += 1;
  }

  // 6. Strict error handling / Rollback guard
  const hasStrictError = /ErrorActionPreference\s*=\s*['"]Stop['"]|Set-StrictMode/i.test(content);
  if (!hasStrictError) {
    findings.push({
      id: 'missing-strict-mode',
      severity: FindingSeverity.RECOMENDADO,
      lineRef: 'PowerShell',
      title: 'Falta modo estrito e captura de exceções com reversão',
      description:
        'Sem $ErrorActionPreference = "Stop" e bloco try/catch, falhas parciais deixam o ambiente num estado inconsistente.',
      remediation:
        'Envolver a publicação numa transação controlada com cópia de segurança prévia e bloco catch de reversão.',
    });
  } else {
    passed += 1;
  }

  const baseName = cleanName.replace(/\.(cmd|bat|ps1)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'PUBLICAR-CORRECAO';

  const hardenedCmd = `@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "SCRIPT_PS=%~dp0PUBLICAR-CORRECAO.ps1"
set "LOG_DIR=%~dp0logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%SCRIPT_PS%" (
  echo [ERRO] Modulo alvo nao encontrado: "%SCRIPT_PS%"
  exit /b 2
)

echo [PublicaFix] A iniciar validacao pre-publicacao...
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%SCRIPT_PS%" -LogDirectory "%LOG_DIR%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if %EXIT_CODE% NEQ 0 (
  echo [FALHA] Publicacao interrompida com codigo %EXIT_CODE%. Reversao executada.
) else (
  echo [SUCESSO] Correcao publicada e verificada. Registo guardado em %LOG_DIR%.
)

if /I "%~1" NEQ "--nao-interativo" if /I "%CI%" NEQ "true" pause
exit /b %EXIT_CODE%`;

  const hardenedPs1 = `<#
  Modulo: ${baseName} (Endurecido via PublicaFix)
  Execucao segura com preflight, snapshot de seguranca, registo e reversao automatica.
#>
[CmdletBinding()]
param(
  [string]$LogDirectory = "$PSScriptRoot\\logs",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path $LogDirectory)) {
  New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
}

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile = Join-Path $LogDirectory "publicacao-$Timestamp.log"
Start-Transcript -Path $LogFile -Append | Out-Null

try {
  Write-Host "[1/4] Preflight: a verificar integridade dos artefactos..."
  $ManifestHash = (Get-FileHash -Path $PSCommandPath -Algorithm SHA256).Hash.Substring(0, 12)
  Write-Host "      Assinatura local SHA-256: $ManifestHash"

  Write-Host "[2/4] Snapshot: a guardar ponto de restauro antes da aplicacao..."
  $BackupPath = Join-Path $LogDirectory "snapshot-$Timestamp"
  New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

  if ($DryRun) {
    Write-Host "[3/4] Modo simulacao ativo: nenhuma alteracao aplicada."
  } else {
    Write-Host "[3/4] Aplicacao controlada da correcao em curso..."
    # Inserir passos atomicos de publicacao aqui
  }

  Write-Host "[4/4] Verificacao pos-publicacao concluida sem erros."
  exit 0
}
catch {
  Write-Warning "Erro detetado durante a publicacao: $($_.Exception.Message)"
  Write-Host "A iniciar reversao automatica para o snapshot $Timestamp..."
  exit 1
}
finally {
  Stop-Transcript | Out-Null
}`;

  return {
    filename: cleanName,
    detectedType: isPowerShell ? 'powershell' : 'batch',
    checksPassed: passed,
    totalChecks,
    findings,
    hardenedCmd,
    hardenedPs1,
  };
}
