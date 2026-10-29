import { randomBytes, scryptSync } from 'node:crypto';
import { getDb } from '../conifg/db';

export interface User {
    Name: string;
    LastName: string;
    Email: string;
    Password: string;
}

// What the API returns: the stored user without the password hash.
export interface PublicUser extends Omit<User, 'Password'> {
    Id: number;
    CreatedAt: string;
    UpdatedAt: string;
}

export class DuplicateEmailError extends Error {
    constructor(email: string) {
        super(`A user with email "${email}" already exists`);
        this.name = 'DuplicateEmailError';
    }
}

const PUBLIC_COLUMNS = 'Id, Name, LastName, Email, CreatedAt, UpdatedAt';
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
    return db.all<PublicUser[]>(`SELECT ${PUBLIC_COLUMNS} FROM Users ORDER BY Id`);
}

export async function findUserById(id: number): Promise<PublicUser | undefined> {
    const db = await getDb();
    return db.get<PublicUser>(`SELECT ${PUBLIC_COLUMNS} FROM Users WHERE Id = ?`, id);
}

export async function createUser(user: User): Promise<PublicUser> {
    const db = await getDb();
    try {
        const result = await db.run(
            'INSERT INTO Users (Name, LastName, Email, Password) VALUES (?, ?, ?, ?)',
            user.Name, user.LastName, user.Email, hashPassword(user.Password),
        );
        return (await findUserById(result.lastID!))!;
    } catch (err) {
        if (isUniqueEmailViolation(err)) throw new DuplicateEmailError(user.Email);
        throw err;
    }
}

export async function updateUser(id: number, changes: Partial<User>): Promise<PublicUser | undefined> {
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
            `UPDATE Users SET ${sets.join(', ')}, UpdatedAt = ${NOW} WHERE Id = ?`,
            ...values, id,
        );
        if (!result.changes) return undefined;
    } catch (err) {
        if (isUniqueEmailViolation(err)) throw new DuplicateEmailError(changes.Email!);
        throw err;
    }

    return findUserById(id);
}

export async function deleteUser(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.run('DELETE FROM Users WHERE Id = ?', id);
    return Boolean(result.changes);
}
