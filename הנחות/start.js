// launcher for pm2
require('child_process').spawn(
  'C:\\Program Files\\nodejs\\npx.cmd',
  ['ts-node', 'src/index.ts'],
  {
    cwd: __dirname,
    stdio: 'inherit',
    shell: false,
  }
).on('exit', (code) => process.exit(code ?? 0));
