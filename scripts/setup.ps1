# Setup script for Neuro
Write-Host "Setting up Neuro project..."
pnpm install
cd apps\api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
Write-Host "Setup complete."
