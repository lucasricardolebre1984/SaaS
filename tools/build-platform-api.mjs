import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

async function assertDirectory(dirPath, label) {
  const stat = await fs.stat(dirPath).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`${label} directory not found: ${dirPath}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir = args.out ? path.resolve(args.out) : '';
  const ownerBuildDir = args.owner ? path.resolve(args.owner) : '';
  const crmBuildDir = args.crm ? path.resolve(args.crm) : '';
  const libsDir = path.resolve('libs');
  const platformSrcDir = path.resolve('apps/platform-api/src');
  const platformConfigDir = path.resolve('apps/platform-api/config');
  const platformSqlDir = path.resolve('apps/platform-api/sql');

  if (!outDir) {
    throw new Error('Missing required arg --out <dir>');
  }

  await assertDirectory(platformSrcDir, 'platform-api source');
  await assertDirectory(platformConfigDir, 'platform-api config');
  await assertDirectory(platformSqlDir, 'platform-api sql');
  await assertDirectory(libsDir, 'workspace libs');
  await assertDirectory(ownerBuildDir, 'owner-console build');
  await assertDirectory(crmBuildDir, 'crm-console build');

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, 'apps'), { recursive: true });

  await fs.cp(platformSrcDir, path.join(outDir, 'apps', 'platform-api', 'src'), { recursive: true, force: true });
  await fs.cp(platformConfigDir, path.join(outDir, 'apps', 'platform-api', 'config'), { recursive: true, force: true });
  await fs.cp(platformSqlDir, path.join(outDir, 'apps', 'platform-api', 'sql'), { recursive: true, force: true });
  await fs.cp(libsDir, path.join(outDir, 'libs'), { recursive: true, force: true });
  await fs.cp(ownerBuildDir, path.join(outDir, 'apps', 'owner-console'), { recursive: true, force: true });
  await fs.cp(crmBuildDir, path.join(outDir, 'apps', 'crm-console'), { recursive: true, force: true });

  await fs.writeFile(
    path.join(outDir, 'package.json'),
    JSON.stringify(
      {
        name: 'app-platform-api-build',
        private: true,
        type: 'module',
        main: './apps/platform-api/src/server.mjs'
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`platform-api build completed: out=${outDir}`);
}

main().catch((error) => {
  console.error(`build_platform_api_error: ${String(error.message ?? error)}`);
  process.exit(1);
});
