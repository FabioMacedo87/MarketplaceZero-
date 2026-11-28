$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (!(Test-Path (Join-Path $root 'package.json'))) { throw 'Abre o PowerShell na pasta do projeto (onde existe package.json).' }
if (!(Get-Command bun -ErrorAction SilentlyContinue)) { throw 'Bun nao encontrado. Instala/ativa o Bun antes de continuar.' }

$sourceCommit = '4b3b4026857ee881ba884a8354c63692a5206f15'
$files = @('src/game/audio.ts', 'src/App.tsx')
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $root "BACKUP-VOZ-$stamp"
$temp = Join-Path $root "TEMP-VOZ-$stamp"
New-Item -ItemType Directory -Path $backup,$temp | Out-Null
$changed = @()

try {
    foreach ($file in $files) {
        $target = Join-Path $root $file
        if (!(Test-Path $target)) { throw "Ficheiro local em falta: $file" }
        $dest = Join-Path $temp ($file -replace '/', '_')
        $url = "https://raw.githubusercontent.com/FabioMacedo87/MarketplaceZero-/$sourceCommit/$file"
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        if ((Get-Item $dest).Length -lt 1000) { throw "Download incompleto: $file" }
        Copy-Item $target (Join-Path $backup ($file -replace '/', '_')) -Force
        Copy-Item $dest $target -Force
        $changed += $file
    }

    $audio = Get-Content (Join-Path $root 'src/game/audio.ts') -Raw
    $app = Get-Content (Join-Path $root 'src/App.tsx') -Raw
    if (!$audio.Contains('public speakNpc') -or !$audio.Contains('startCityAmbience') -or !$app.Contains('soundEngine.speakNpc(line.text, line.speaker)')) {
        throw 'A validacao do sistema de voz e ambiente sonoro falhou.'
    }

    Write-Host '[1/2] Vozes NPC e ambiente sonoro aplicados.' -ForegroundColor Cyan
    Write-Host '[2/2] A validar compilacao...' -ForegroundColor Cyan
    bun run build
    if ($LASTEXITCODE -ne 0) { throw 'A compilacao falhou.' }

    Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'VOZ E AMBIENTE SONORO INSTALADOS COM SUCESSO.' -ForegroundColor Green
    Write-Host 'Backup guardado em: ' $backup
    Write-Host 'A iniciar PORTUGAL LIFE em http://localhost:3000'
    bun run dev
}
catch {
    foreach ($file in $changed) {
        $target = Join-Path $root $file
        $saved = Join-Path $backup ($file -replace '/', '_')
        if (Test-Path $saved) { Copy-Item $saved $target -Force }
    }
    Write-Host 'A atualizacao foi revertida. Os ficheiros anteriores foram restaurados.' -ForegroundColor Yellow
    throw
}
finally {
    Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
