import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const checks = [
  {
    name: 'owner persona',
    json: 'tenants/sample-tenant-001/personas/owner.json',
    schema: 'libs/core/persona-registry/schemas/owner-persona.schema.json'
  },
  {
    name: 'whatsapp persona',
    json: 'tenants/sample-tenant-001/personas/whatsapp.json',
    schema: 'libs/core/persona-registry/schemas/whatsapp-persona.schema.json'
  },
  {
    name: 'tenant policy',
    json: 'tenants/sample-tenant-001/policies/default.json',
    schema: 'libs/core/persona-registry/schemas/tenant-policy.schema.json'
  }
];

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

let hasErrors = false;

for (const check of checks) {
  const jsonPath = path.join(repoRoot, check.json);
  const schemaPath = path.join(repoRoot, check.schema);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Missing JSON file: ${jsonPath}`);
    hasErrors = true;
    continue;
  }
  if (!fs.existsSync(schemaPath)) {
    console.error(`Missing schema file: ${schemaPath}`);
    hasErrors = true;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);

  if (!validate(data)) {
    console.error(`FAIL: ${check.name}`);
    for (const err of validate.errors ?? []) {
      console.error(`  - ${err.instancePath || '/'} ${err.message ?? ''}`.trim());
    }
    hasErrors = true;
    continue;
  }

  console.log(`OK: ${check.name}`);
}

if (hasErrors) {
  process.exit(1);
}

console.log('Sample tenant pack validation passed.');
