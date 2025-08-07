#!/bin/bash
# Static build script for Cloudflare Pages deployment
# This builds only the client-side React app for static hosting

echo "Building static client for Cloudflare Pages..."

# Build the client app
npm run build:client

# Copy static files to root for Cloudflare Pages
cp -r dist/public/* .
cp dist/public/index.html ./index.html

echo "Static build complete. Files ready for Cloudflare Pages deployment."
echo "Upload the entire repository to Cloudflare Pages."
echo "Set build command to: npm run build:client"
echo "Set build output directory to: dist/public"