$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

if (!(Test-Path (Join-Path $projectRoot "package.json"))) {
    throw "Coloca este script na pasta principal do PORTUGAL LIFE, junto de package.json."
}

$portsToCheck = @(3000, 24678)
$rootNeedle = $projectRoot.TrimEnd('\')

Write-Host ""
Write-Host "[1/6] A identificar servidores antigos..." -ForegroundColor Cyan

$listeners = @(
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $portsToCheck -contains $_.LocalPort } |
    Select-Object -ExpandProperty OwningProcess -Unique
)

foreach ($processId in $listeners) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
    if (-not $proc) { continue }

    $cmd = [string]$proc.CommandLine
    $belongsToProject = $cmd.IndexOf($rootNeedle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $isGameServer = $cmd -match '(?i)(server\.ts|vite|tsx)'

    if ($belongsToProject -and $isGameServer) {
        Write-Host "A terminar $($proc.Name), PID $processId..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force
    }
    else {
        Write-Host "Porta ocupada por processo alheio ao projeto:" -ForegroundColor Red
        $proc | Format-List ProcessId, Name, ExecutablePath, CommandLine
        throw "Por segurança, não terminei este processo. Envia-me estes dados."
    }
}

Start-Sleep -Seconds 2

$remaining = @(
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $portsToCheck -contains $_.LocalPort }
)

if ($remaining.Count -gt 0) {
    foreach ($listener in $remaining) {
        Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" |
            Format-List ProcessId, Name, CommandLine
    }
    throw "Ainda existe um processo nas portas 3000 ou 24678."
}

Write-Host "Portas 3000 e 24678 livres." -ForegroundColor Green

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$sourceCommit = "f387469444044819781092d7288e62a4c6973477"
$baseUrl = "https://raw.githubusercontent.com/FabioMacedo87/MarketplaceZero-/$sourceCommit"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stageRoot = Join-Path $env:TEMP "PORTUGAL-LIFE-REALISMO-$stamp"
$backupRoot = Join-Path $projectRoot "BACKUP-REALISMO-$stamp"

New-Item -ItemType Directory -Force -Path $stageRoot, $backupRoot | Out-Null

$files = @(
    @{ Local="src\game\scene3d.ts"; Remote="src/game/scene3d.ts"; Min=20000 },
    @{ Local="src\game\textures.ts"; Remote="src/game/textures.ts"; Min=10000 },
    @{ Local="tsconfig.json"; Remote="tsconfig.json"; Min=100 },
    @{ Local=".gitignore"; Remote=".gitignore"; Min=20 },
    @{ Local="INSTALAR-MODELOS-REALISTAS.ps1"; Remote="INSTALAR-MODELOS-REALISTAS.ps1"; Min=3000 },
    @{ Local="CREDITOS-MODELOS-3D.md"; Remote="CREDITOS-MODELOS-3D.md"; Min=300 }
)

Write-Host ""
Write-Host "[2/6] A descarregar código e documentação..." -ForegroundColor Cyan

foreach ($file in $files) {
    $stagedFile = Join-Path $stageRoot $file.Local
    New-Item -ItemType Directory -Force -Path (Split-Path $stagedFile -Parent) | Out-Null

    $downloadUrl = "$baseUrl/$($file.Remote)?cache=$stamp"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $stagedFile -UseBasicParsing -TimeoutSec 120

    if (!(Test-Path $stagedFile) -or (Get-Item $stagedFile).Length -lt $file.Min) {
        throw "Download incompleto: $($file.Local)"
    }

    if ($file.Local -eq "INSTALAR-MODELOS-REALISTAS.ps1") {
        $installerText = [System.IO.File]::ReadAllText($stagedFile)
        if (!$installerText.Contains("Existing valid files were preserved.") -or $installerText.Contains("Os ficheiros ja existentes")) {
            throw "O servidor devolveu uma versao antiga do instalador. Nenhum codigo foi aplicado."
        }
    }

    Write-Host "[OK] $($file.Local)"
}

$scene = [System.IO.File]::ReadAllText((Join-Path $stageRoot "src\game\scene3d.ts"))
$textures = [System.IO.File]::ReadAllText((Join-Path $stageRoot "src\game\textures.ts"))
$tsconfig = [System.IO.File]::ReadAllText((Join-Path $stageRoot "tsconfig.json"))

if (!$scene.Contains("lucia-locomotion.glb") -or !$scene.Contains("AnimationMixer")) {
    throw "A versão descarregada não passou a validação dos modelos humanos."
}
if (!$textures.Contains("Procedural PBR asphalt") -or !$scene.Contains("Raised junction surfaces and four-sided zebra crossings") -or !$scene.Contains("const sidewalkWidth = 2.35")) {
    throw "A versão descarregada não passou a validação das ruas e dos mapas realistas."
}
if (!$tsconfig.Contains("BACKUP-*")) {
    throw "A configuração TypeScript não exclui as pastas de backup."
}

Write-Host ""
Write-Host "[3/6] A guardar backups e aplicar código..." -ForegroundColor Cyan

foreach ($file in $files) {
    $destination = Join-Path $projectRoot $file.Local
    $backupFile = Join-Path $backupRoot $file.Local

    New-Item -ItemType Directory -Force -Path (Split-Path $backupFile -Parent) | Out-Null

    if (Test-Path $destination) {
        Copy-Item $destination $backupFile -Force
    }

    Copy-Item (Join-Path $stageRoot $file.Local) $destination -Force
}

$installedInstaller = [System.IO.File]::ReadAllText((Join-Path $projectRoot "INSTALAR-MODELOS-REALISTAS.ps1"))
if (!$installedInstaller.Contains("Existing valid files were preserved.")) {
    throw "A validacao do instalador local falhou. O ficheiro esperado nao foi aplicado."
}

Write-Host "Codigo atualizado. Backup: $backupRoot" -ForegroundColor Green

try {
    Write-Host ""
    Write-Host "[4/6] A descarregar personagens e automóveis 3D..." -ForegroundColor Cyan

    & (Join-Path $projectRoot "INSTALAR-MODELOS-REALISTAS.ps1")

    Write-Host ""
    Write-Host "[5/6] A compilar PORTUGAL LIFE com Vite..." -ForegroundColor Cyan

    & bun run build

    if ($LASTEXITCODE -ne 0) {
        throw "A compilação falhou."
    }

    Write-Host ""
    Write-Host "COMPILAÇÃO CONCLUÍDA!" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "A restaurar os ficheiros de código a partir do backup..." -ForegroundColor Yellow

    foreach ($file in $files) {
        $backupFile = Join-Path $backupRoot $file.Local
        $destination = Join-Path $projectRoot $file.Local

        if (Test-Path $backupFile) {
            Copy-Item $backupFile $destination -Force
        }
    }

    throw
}
finally {
    Remove-Item $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "[6/6] A iniciar PORTUGAL LIFE..." -ForegroundColor Cyan
Write-Host "Mantém esta janela aberta. Endereço: http://localhost:3000" -ForegroundColor Green

& bun run dev
