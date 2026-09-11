const { spawn } = require('node:child_process');
const path = require('node:path');
const electronBinary = require('electron');

const vitestMjs = path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs');
const args = [vitestMjs, ...process.argv.slice(2)];

// Run vitest inside Electron's Node runtime (matches better-sqlite3 native ABI)
const child = spawn(electronBinary, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
