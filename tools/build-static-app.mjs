import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const src = args.src ? path.resolve(args.src) : '';
  const out = args.out ? path.resolve(args.out) : '';

  if (!src || !out) {
    throw new Error('Missing required args. Usage: --src <dir> --out <dir>');
  }

  const srcStat = await fs.stat(src).catch(() => null);
  if (!srcStat?.isDirectory()) {
    throw new Error(`Source directory not found: ${src}`);
  }

  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.cp(src, out, { recursive: true, force: true });

  console.log(`static build completed: src=${src} out=${out}`);
}

main().catch((error) => {
  console.error(`build_static_app_error: ${String(error.message ?? error)}`);
  process.exit(1);
});
