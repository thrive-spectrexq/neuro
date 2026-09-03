# Setup script for Neuro
Write-Host "Setting up Neuro project..."
pnpm install

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example"
}

Push-Location backend
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Pop-Location
Write-Host "Setup complete. Run 'pnpm start' or './scripts/dev.ps1' to launch."
