import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generate } from 'selfsigned';

export const TLS_CERT_PATH = process.env.TLS_CERT_PATH || 'certs/localhost.crt';
export const TLS_KEY_PATH = process.env.TLS_KEY_PATH || 'certs/localhost.key';

const VALID_DAYS = 365;

// Self-signed certificate for local use only. Clients must trust TLS_CERT_PATH
// (or skip verification) to connect without certificate errors.
async function createLocalCertificate(): Promise<void> {
    const notAfterDate = new Date();
    notAfterDate.setDate(notAfterDate.getDate() + VALID_DAYS);

    const pems = await generate([{ name: 'commonName', value: 'localhost' }], {
        keySize: 2048,
        algorithm: 'sha256',
        notAfterDate,
        extensions: [
            { name: 'basicConstraints', cA: false },
            { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
            { name: 'extKeyUsage', serverAuth: true },
            {
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: '::1' },
                ],
            },
        ],
    });

    for (const file of [TLS_CERT_PATH, TLS_KEY_PATH]) {
        mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    }
    writeFileSync(TLS_CERT_PATH, pems.cert);
    writeFileSync(TLS_KEY_PATH, pems.private, { mode: 0o600 });
    console.log(`Created self-signed certificate ${TLS_CERT_PATH}`);
}

export async function loadTlsOptions(): Promise<{ cert: Buffer; key: Buffer }> {
    if (!existsSync(TLS_CERT_PATH) || !existsSync(TLS_KEY_PATH)) {
        await createLocalCertificate();
    }
    return { cert: readFileSync(TLS_CERT_PATH), key: readFileSync(TLS_KEY_PATH) };
}
