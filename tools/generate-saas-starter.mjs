import fs from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_LAYOUTS = new Set(['fabio2', 'studio']);
const ALLOWED_PALETTES = new Set(['ocean', 'forest', 'sunset']);

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

function toSlug(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function walkFiles(root, current = root, out = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, full, out);
      continue;
    }
    const rel = path.relative(root, full);
    out.push(rel);
  }
  return out;
}

function renderTemplate(content, ctx) {
  return content
    .replaceAll('{{saas_name}}', ctx.saasName)
    .replaceAll('{{tenant_id}}', ctx.tenantId)
    .replaceAll('{{layout_default}}', ctx.layoutDefault)
    .replaceAll('{{palette_default}}', ctx.paletteDefault)
    .replaceAll('{{generated_at}}', ctx.generatedAt);
}

async function main() {
  const args = parseArgs(process.argv);

  const saasName = args['saas-name'] ?? args.saas_name;
  const tenantId = args['tenant-id'] ?? args.tenant_id;
  const layoutDefault = args['layout-default'] ?? args.layout_default ?? 'fabio2';
  const paletteDefault = args['palette-default'] ?? args.palette_default ?? 'ocean';
  const dryRun = args['dry-run'] === 'true';
  const overwrite = args.overwrite === 'true';

  if (!saasName) {
    throw new Error('Missing required arg --saas-name');
  }
  if (!tenantId) {
    throw new Error('Missing required arg --tenant-id');
  }
  if (!ALLOWED_LAYOUTS.has(layoutDefault)) {
    throw new Error(`Invalid layout '${layoutDefault}'. Allowed: fabio2, studio`);
  }
  if (!ALLOWED_PALETTES.has(paletteDefault)) {
    throw new Error(`Invalid palette '${paletteDefault}'. Allowed: ocean, forest, sunset`);
  }

  const slug = toSlug(saasName);
  if (!slug) {
    throw new Error('Could not build slug from --saas-name');
  }

  const templateRoot = path.resolve('templates/saas-starter');
  const outRoot = path.resolve(
    args.output ?? args.out ?? path.join('.tmp', 'generated-saas', slug)
  );

  const templateStat = await fs.stat(templateRoot).catch(() => null);
  if (!templateStat?.isDirectory()) {
    throw new Error(`Template root not found: ${templateRoot}`);
  }

  const exists = await fs.stat(outRoot).catch(() => null);
  if (exists && !overwrite) {
    throw new Error(`Output already exists: ${outRoot}. Use --overwrite to replace.`);
  }

  const ctx = {
    saasName,
    tenantId,
    layoutDefault,
    paletteDefault,
    generatedAt: new Date().toISOString()
  };

  const files = await walkFiles(templateRoot);
  if (dryRun) {
    console.log('dry-run: generation plan');
    console.log(`template=${templateRoot}`);
    console.log(`output=${outRoot}`);
    for (const rel of files) {
      console.log(`- write ${rel}`);
    }
    return;
  }

  if (exists && overwrite) {
    await fs.rm(outRoot, { recursive: true, force: true });
  }

  await fs.mkdir(outRoot, { recursive: true });
  for (const rel of files) {
    const srcPath = path.join(templateRoot, rel);
    const dstPath = path.join(outRoot, rel);
    const raw = await fs.readFile(srcPath, 'utf8');
    const rendered = renderTemplate(raw, ctx);
    await fs.mkdir(path.dirname(dstPath), { recursive: true });
    await fs.writeFile(dstPath, rendered, 'utf8');
  }

  console.log(`generated saas starter at ${outRoot}`);
}

main().catch((error) => {
  console.error(`generate_saas_starter_error: ${String(error.message ?? error)}`);
  process.exit(1);
});
