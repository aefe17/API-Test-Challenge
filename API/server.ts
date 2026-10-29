import app from './app';
import { closeDb, getDb } from './conifg/db';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

await getDb();

const server = app.listen(PORT, HOST, () => {
    console.log(`Users API listening on http://${HOST}:${PORT}`);
});

function shutdown(): void {
    server.close(() => {
        closeDb().finally(() => process.exit(0));
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
