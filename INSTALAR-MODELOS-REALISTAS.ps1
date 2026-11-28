$ErrorActionPreference = "Stop"

# Installs local GLB models for PORTUGAL LIFE.
# Run this file from the project root (the folder containing package.json).

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    throw "Place this file in the PORTUGAL LIFE project root, next to package.json."
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$assets = @(
    @{
        RelativePath = "public\models\characters\lucia-locomotion.glb"
        Url = "https://files.innerscene.com/library/locomotion-collection-maya-3d-person-animated-1499b2fd/565cfb8a45b8a67a79c4/locomotion-collection-maya-3d-person-animated.glb"
        MinimumBytes = 10000000
        Label = "Female character + 7 animations (CC0)"
    },
    @{
        RelativePath = "public\models\characters\jason-locomotion.glb"
        Url = "https://files.innerscene.com/library/locomotion-collection-sam-3d-person-animated-dc23800f/735aec6a564c1def48e8/locomotion-collection-sam-3d-person-animated.glb"
        MinimumBytes = 10000000
        Label = "Male character + 7 animations (CC0)"
    },
    @{
        RelativePath = "public\models\cars\rear-engine-sports-coupe.glb"
        Url = "https://models.vinish.dev/realistic-cars/rear-engine-sports-coupe.glb"
        MinimumBytes = 2500000
        Label = "Sports coupe"
    },
    @{
        RelativePath = "public\models\cars\muscle-coupe.glb"
        Url = "https://models.vinish.dev/realistic-cars/muscle-coupe.glb"
        MinimumBytes = 2500000
        Label = "Muscle coupe"
    },
    @{
        RelativePath = "public\models\cars\boxy-off-roader.glb"
        Url = "https://models.vinish.dev/realistic-cars/boxy-off-roader.glb"
        MinimumBytes = 2500000
        Label = "Off-road vehicle"
    },
    @{
        RelativePath = "public\models\cars\sport-sedan.glb"
        Url = "https://models.vinish.dev/realistic-cars/sport-sedan.glb"
        MinimumBytes = 2500000
        Label = "Police sedan"
    },
    @{
        RelativePath = "public\models\cars\retro-city-car.glb"
        Url = "https://models.vinish.dev/realistic-cars/retro-city-car.glb"
        MinimumBytes = 2000000
        Label = "City taxi"
    }
)

function Test-GlbFile([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $header = New-Object byte[] 4
        $read = $stream.Read($header, 0, 4)
        if ($read -ne 4) { return $false }
        return ([System.Text.Encoding]::ASCII.GetString($header) -eq "glTF")
    }
    finally {
        $stream.Dispose()
    }
}

foreach ($asset in $assets) {
    $destination = Join-Path $projectRoot $asset.RelativePath
    $directory = Split-Path $destination -Parent
    New-Item -ItemType Directory -Force -Path $directory | Out-Null

    if ((Test-Path $destination) -and (Get-Item $destination).Length -ge $asset.MinimumBytes -and (Test-GlbFile $destination)) {
        Write-Host "[EXISTS] $($asset.Label)" -ForegroundColor DarkGreen
        continue
    }

    $temporary = "$destination.download"
    Remove-Item $temporary -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "Downloading: $($asset.Label)" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $asset.Url -OutFile $temporary -UseBasicParsing -TimeoutSec 180

    $download = Get-Item $temporary
    if ($download.Length -lt $asset.MinimumBytes -or -not (Test-GlbFile $temporary)) {
        Remove-Item $temporary -Force -ErrorAction SilentlyContinue
        throw "Downloaded file failed GLB validation: $($asset.Label)"
    }

    Move-Item $temporary $destination -Force
    $sizeMb = [Math]::Round((Get-Item $destination).Length / 1MB, 1)
    Write-Host "[OK] $($asset.Label) - $sizeMb MB" -ForegroundColor Green
}

Write-Host ""
Write-Host "3D MODELS INSTALLED." -ForegroundColor Green
Write-Host "Characters: public\models\characters"
Write-Host "Vehicles: public\models\cars"
Write-Host "Existing valid files were preserved."
