import { randomBytes, randomUUID, scryptSync, type UUID } from 'node:crypto';
import { getDb } from '../conifg/db';

export interface User {
    Name: string;
    LastName: string;
    Email: string;
    Password: string;
}

// What the API returns: the stored user without the password hash.
export interface PublicUser extends Omit<User, 'Password'> {
    ID: UUID;
    CreatedAt: Date;
    UpdatedAt: Date;
}

// SQLite has no date type: timestamps are stored as ISO-8601 text.
type UserRow = Omit<PublicUser, 'CreatedAt' | 'UpdatedAt'> & {
    CreatedAt: string;
    UpdatedAt: string;
};

function toPublicUser(row: UserRow): PublicUser {
    return { ...row, CreatedAt: new Date(row.CreatedAt), UpdatedAt: new Date(row.UpdatedAt) };
}

export class DuplicateEmailError extends Error {
    constructor(email: string) {
        super(`A user with email "${email}" already exists`);
        this.name = 'DuplicateEmailError';
    }
}

// Aliased so the response keys are exact even if a table declares them in other casing (e.g. Id).
const PUBLIC_COLUMNS = 'ID AS ID, Name AS Name, LastName AS LastName, Email AS Email, '
    + 'CreatedAt AS CreatedAt, UpdatedAt AS UpdatedAt';
const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function isUniqueEmailViolation(err: unknown): boolean {
    return err instanceof Error
        && (err as { code?: string }).code === 'SQLITE_CONSTRAINT'
        && err.message.includes('Users.Email');
}

export async function findAllUsers(): Promise<PublicUser[]> {
    const db = await getDb();
    // rowid keeps insertion order; ordering by a random UUID would shuffle users.
    const rows = await db.all<UserRow[]>(`SELECT ${PUBLIC_COLUMNS} FROM Users ORDER BY rowid`);
    return rows.map(toPublicUser);
}

export async function findUserById(id: UUID): Promise<PublicUser | undefined> {
    const db = await getDb();
    const row = await db.get<UserRow>(`SELECT ${PUBLIC_COLUMNS} FROM Users WHERE ID = ?`, id);
    return row && toPublicUser(row);
}

export async function createUser(user: User): Promise<PublicUser> {
    const db = await getDb();
    const id = randomUUID();
    try {
        await db.run(
            'INSERT INTO Users (ID, Name, LastName, Email, Password) VALUES (?, ?, ?, ?, ?)',
            id, user.Name, user.LastName, user.Email, hashPassword(user.Password),
        );
        return (await findUserById(id))!;
    } catch (err) {
        if (isUniqueEmailViolation(err)) throw new DuplicateEmailError(user.Email);
        throw err;
    }
}

export async function updateUser(id: UUID, changes: Partial<User>): Promise<PublicUser | undefined> {
    const db = await getDb();

    // Column names come from this fixed list, never from the request.
    const columns: (keyof User)[] = ['Name', 'LastName', 'Email', 'Password'];
    const sets: string[] = [];
    const values: string[] = [];
    for (const column of columns) {
        const value = changes[column];
        if (value === undefined) continue;
        sets.push(`${column} = ?`);
        values.push(column === 'Password' ? hashPassword(value) : value);
    }

    if (sets.length === 0) return findUserById(id);

    try {
        const result = await db.run(
            `UPDATE Users SET ${sets.join(', ')}, UpdatedAt = ${NOW} WHERE ID = ?`,
            ...values, id,
        );
        if (!result.changes) return undefined;
    } catch (err) {
        if (isUniqueEmailViolation(err)) throw new DuplicateEmailError(changes.Email!);
        throw err;
    }

    return findUserById(id);
}

export async function deleteUser(id: UUID): Promise<boolean> {
    const db = await getDb();
    const result = await db.run('DELETE FROM Users WHERE ID = ?', id);
    return Boolean(result.changes);
}
