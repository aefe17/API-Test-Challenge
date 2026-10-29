import type { Request, Response } from 'express';
import {
    createUser,
    deleteUser,
    DuplicateEmailError,
    findAllUsers,
    findUserById,
    updateUser,
    type User,
} from '../models/userModel';

const USER_FIELDS: (keyof User)[] = ['Name', 'LastName', 'Email', 'Password'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type Validation =
    | { ok: true; data: Partial<User> }
    | { ok: false; errors: string[] };

// `partial` is for PATCH: fields are optional but at least one is required.
function validateUser(body: unknown, partial: boolean): Validation {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return { ok: false, errors: ['Request body must be a JSON object'] };
    }

    const input = body as Record<string, unknown>;
    const data: Partial<User> = {};
    const errors: string[] = [];

    for (const field of USER_FIELDS) {
        const value = input[field];
        if (value === undefined) {
            if (!partial) errors.push(`${field} is required`);
            continue;
        }
        if (typeof value !== 'string' || value.trim() === '') {
            errors.push(`${field} must be a non-empty string`);
            continue;
        }
        data[field] = field === 'Password' ? value : value.trim();
    }

    if (data.Email !== undefined && !EMAIL_PATTERN.test(data.Email)) {
        errors.push('Email must be a valid email address');
    }
    if (data.Password !== undefined && data.Password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (partial && errors.length === 0 && Object.keys(data).length === 0) {
        errors.push(`Provide at least one of: ${USER_FIELDS.join(', ')}`);
    }

    return errors.length ? { ok: false, errors } : { ok: true, data };
}

function parseId(req: Request, res: Response): number | undefined {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Id must be a positive integer' });
        return undefined;
    }
    return id;
}

function sendDuplicateOrRethrow(err: unknown, res: Response): void {
    if (err instanceof DuplicateEmailError) {
        res.status(409).json({ error: err.message });
        return;
    }
    throw err;
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
    res.json(await findAllUsers());
}

export async function getUser(req: Request, res: Response): Promise<void> {
    const id = parseId(req, res);
    if (id === undefined) return;

    const user = await findUserById(id);
    if (!user) {
        res.status(404).json({ error: `User ${id} not found` });
        return;
    }
    res.json(user);
}

export async function postUser(req: Request, res: Response): Promise<void> {
    const result = validateUser(req.body, false);
    if (!result.ok) {
        res.status(400).json({ errors: result.errors });
        return;
    }

    try {
        const user = await createUser(result.data as User);
        res.status(201).location(`/users/${user.Id}`).json(user);
    } catch (err) {
        sendDuplicateOrRethrow(err, res);
    }
}

// PUT replaces every field, PATCH changes only the fields sent.
async function writeUser(req: Request, res: Response, partial: boolean): Promise<void> {
    const id = parseId(req, res);
    if (id === undefined) return;

    const result = validateUser(req.body, partial);
    if (!result.ok) {
        res.status(400).json({ errors: result.errors });
        return;
    }

    try {
        const user = await updateUser(id, result.data);
        if (!user) {
            res.status(404).json({ error: `User ${id} not found` });
            return;
        }
        res.json(user);
    } catch (err) {
        sendDuplicateOrRethrow(err, res);
    }
}

export function putUser(req: Request, res: Response): Promise<void> {
    return writeUser(req, res, false);
}

export function patchUser(req: Request, res: Response): Promise<void> {
    return writeUser(req, res, true);
}

export async function removeUser(req: Request, res: Response): Promise<void> {
    const id = parseId(req, res);
    if (id === undefined) return;

    if (!(await deleteUser(id))) {
        res.status(404).json({ error: `User ${id} not found` });
        return;
    }
    res.status(204).end();
}
