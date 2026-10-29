import express, { type NextFunction, type Request, type Response } from 'express';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/users', userRoutes);

app.use((req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Malformed JSON bodies come from express.json() with status 400.
    if ((err as { type?: string }).type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Request body is not valid JSON' });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;
