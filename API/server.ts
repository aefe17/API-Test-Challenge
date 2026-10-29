import { createServer } from 'node:https';
import app from './app';
import { closeDb, getDb } from './conifg/db';
import { loadTlsOptions } from './conifg/tls';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

await getDb();

const server = createServer(await loadTlsOptions(), app).listen(PORT, HOST, () => {
    console.log(`Users API listening on https://${HOST}:${PORT}`);
});

function shutdown(): void {
    server.close(() => {
        closeDb().finally(() => process.exit(0));
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
