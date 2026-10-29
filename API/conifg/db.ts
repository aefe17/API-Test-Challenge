import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

const DB_PATH = process.env.DB_PATH || 'data/users.db';

const CREATE_USERS = `
    CREATE TABLE IF NOT EXISTS Users (
        ID        TEXT PRIMARY KEY,
        Name      TEXT NOT NULL,
        LastName  TEXT NOT NULL,
        Email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
        Password  TEXT NOT NULL,
        CreatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UpdatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
`;

let dbPromise: Promise<Database> | undefined;

// Databases created before ids became UUIDs have an INTEGER ID column.
// Rebuild that table once, giving every existing user a new UUID.
async function upgradeIntegerIds(db: Database): Promise<void> {
    const columns = await db.all<{ name: string; type: string }[]>('PRAGMA table_info(Users)');
    const idColumn = columns.find((column) => column.name.toUpperCase() === 'ID');
    if (idColumn?.type.toUpperCase() !== 'INTEGER') return;

    await db.exec('BEGIN');
    try {
        await db.exec('ALTER TABLE Users RENAME TO Users_old');
        await db.exec(CREATE_USERS);
        // The alias matters: SQLite names result columns as declared (Id), not as queried.
        const oldRows = await db.all<{ ID: number }[]>('SELECT ID AS ID FROM Users_old ORDER BY ID');
        for (const { ID } of oldRows) {
            await db.run(
                `INSERT INTO Users (ID, Name, LastName, Email, Password, CreatedAt, UpdatedAt)
                 SELECT ?, Name, LastName, Email, Password, CreatedAt, UpdatedAt FROM Users_old WHERE ID = ?`,
                randomUUID(), ID,
            );
        }
        const copied = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM Users');
        if (copied?.total !== oldRows.length) {
            throw new Error(`Upgrade copied ${copied?.total} of ${oldRows.length} users`);
        }
        await db.exec('DROP TABLE Users_old');
        await db.exec('COMMIT');
    } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
    }
}

async function init(): Promise<Database> {
    if (DB_PATH !== ':memory:') {
        mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
    }

    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await db.exec(CREATE_USERS);
    await upgradeIntegerIds(db);
    return db;
}

export function getDb(): Promise<Database> {
    dbPromise ??= init();
    return dbPromise;
}

export async function closeDb(): Promise<void> {
    if (!dbPromise) return;
    const db = await dbPromise;
    dbPromise = undefined;
    await db.close();
}
