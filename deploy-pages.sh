#!/bin/bash
# QFM Studio Deploy Script
# Builds frontend and deploys to Cloudflare Pages
set -e

echo "🏗️  Building frontend..."
cd /home/anson/qfm-studio/apps/web
npm run build

echo "🚀  Deploying to Cloudflare Pages..."
# Get token from env var (set in ~/.bashrc or CI secrets)
# export CLOUDFLARE_API_TOKEN=your_token_here
wrangler pages deploy dist --project-name=qfm-studio --branch=main --commit-dirty=true

echo ""
echo "✅  Deployed!"
echo "   https://qfmstudio.com"
echo "   https://www.qfmstudio.com"
echo "   https://qfm-studio.pages.dev"