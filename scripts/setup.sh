#!/bin/bash
echo "Setting up Neuro project..."
pnpm install
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
echo "Setup complete."
