import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

const DB_PATH = process.env.DB_PATH || 'data/users.db';

let dbPromise: Promise<Database> | undefined;

async function init(): Promise<Database> {
    if (DB_PATH !== ':memory:') {
        mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
    }

    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS Users (
            Id        INTEGER PRIMARY KEY AUTOINCREMENT,
            Name      TEXT NOT NULL,
            LastName  TEXT NOT NULL,
            Email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
            Password  TEXT NOT NULL,
            CreatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            UpdatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
    `);

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
