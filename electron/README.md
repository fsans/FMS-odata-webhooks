# Electron Setup for FileMaker OData Webhooks Manager

This directory contains the Electron main process and related files for packaging the application as a standalone desktop app.

## Files

- **main.js** - Electron main process that manages the app window and backend server
- **preload.js** - Preload script for secure context isolation

## How it works

1. When the app starts, Electron launches the Node.js backend server
2. The React frontend (built from Vite) is loaded into the Electron window
3. The backend serves the API on localhost:3000
4. The frontend communicates with the backend via HTTP

## Development

Run `npm run electron-dev` to start the app in development mode with hot reload.

## Building

Run `npm run electron-build` to create distributable packages for Windows, macOS, and Linux.
