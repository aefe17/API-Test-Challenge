import type { UUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
    createUser,
    deleteUser,
    DuplicateEmailError,
    findAllUsers,
    findUserById,
    updateUser,
    type PublicUser,
    type User,
} from '../models/userModel';

const USER_FIELDS: (keyof User)[] = ['Name', 'LastName', 'Email', 'Password'];
// Local part: no leading, trailing or repeated dots. Domain: labels of letters, digits and inner
// hyphens, ending in a TLD of at least two letters.
const EMAIL_PATTERN =
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_EMAIL_LOCAL_LENGTH = 64;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MIN_PASSWORD_LENGTH = 8;

// Short UTC date, e.g. 2026-10-29.
function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function toResponse(user: PublicUser) {
    return { ...user, CreatedAt: formatDate(user.CreatedAt), UpdatedAt: formatDate(user.UpdatedAt) };
}

function isValidEmail(email: string): boolean {
    return email.length <= MAX_EMAIL_LENGTH
        && email.indexOf('@') <= MAX_EMAIL_LOCAL_LENGTH
        && EMAIL_PATTERN.test(email);
}

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

    if (data.Email !== undefined && !isValidEmail(data.Email)) {
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

// Ids are stored lowercase, so uppercase input is normalized before lookup.
function parseId(req: Request, res: Response): UUID | undefined {
    const id = String(req.params.id).toLowerCase();
    if (!UUID_PATTERN.test(id)) {
        res.status(400).json({ error: 'ID must be a valid UUID' });
        return undefined;
    }
    return id as UUID;
}

function sendDuplicateOrRethrow(err: unknown, res: Response): void {
    if (err instanceof DuplicateEmailError) {
        res.status(409).json({ error: err.message });
        return;
    }
    throw err;
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
    res.json((await findAllUsers()).map(toResponse));
}

export async function getUser(req: Request, res: Response): Promise<void> {
    const id = parseId(req, res);
    if (id === undefined) return;

    const user = await findUserById(id);
    if (!user) {
        res.status(404).json({ error: `User ${id} not found` });
        return;
    }
    res.json(toResponse(user));
}

export async function postUser(req: Request, res: Response): Promise<void> {
    const result = validateUser(req.body, false);
    if (!result.ok) {
        res.status(400).json({ errors: result.errors });
        return;
    }

    try {
        const user = await createUser(result.data as User);
        res.status(201).location(`/users/${user.ID}`).json(toResponse(user));
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
        res.json(toResponse(user));
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
