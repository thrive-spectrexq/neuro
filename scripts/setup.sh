#!/bin/bash
echo "Setting up Neuro project..."
pnpm install

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
fi

cd backend
if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[dev]"
cd ..
echo "Setup complete. Run 'pnpm start' or './scripts/dev.sh' to launch."
