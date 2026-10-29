import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Trust the API's self-signed certificate (created on first `pnpm start`) in the
// test workers, so HTTPS requests pass normal certificate checks.
const apiCert = path.resolve(process.env.TLS_CERT_PATH || 'certs/localhost.crt');
if (!process.env.NODE_EXTRA_CA_CERTS && existsSync(apiCert)) {
  process.env.NODE_EXTRA_CA_CERTS = apiCert;
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.?(c|m)[jt]s?(x)'],
    environment: 'node',
    testTimeout: 30_000,
    passWithNoTests: true,
  },
});
