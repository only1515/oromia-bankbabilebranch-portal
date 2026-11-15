const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const projectRoot = __dirname;
const isVercel = Boolean(process.env.VERCEL);
const DB_PATH = process.env.DB_PATH || path.join(isVercel ? os.tmpdir() : projectRoot, 'oromia_bank.db');

if (isVercel && !fs.existsSync(DB_PATH)) {
    const bundledDb = path.join(projectRoot, 'oromia_bank.db');
    if (fs.existsSync(bundledDb)) {
        try {
            fs.copyFileSync(bundledDb, DB_PATH);
            console.log('Copied bundled database to /tmp/oromia_bank.db');
        } catch (e) {
            console.warn('Could not copy bundled DB to /tmp, will initialize fresh:', e.message);
        }
    }
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

const ADMIN_ACCOUNTS = {
    admin: { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' },
    manager: { username: process.env.MANAGER_USERNAME || 'manager', password: process.env.MANAGER_PASSWORD || 'manager123' },
    cashier: { username: process.env.CASHIER_USERNAME || 'cashier', password: process.env.CASHIER_PASSWORD || 'cashier123' }
};

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Could not open database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at:', DB_PATH);
});

function hashPassword(password) {
    return crypto.pbkdf2Sync(password, 'oromia-bank-salt', 100000, 64, 'sha256').toString('hex');
}

function createToken() {
    return crypto.randomBytes(32).toString('hex');
}

function runSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function getSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function allSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function initializeDatabase() {
    db.serialize(() => {
        db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS admin_login_attempts (
        username TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS customer_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        account_number TEXT NOT NULL,
        service_type TEXT NOT NULL,
        branch_code TEXT NOT NULL DEFAULT 'ORB-BAB01',
        status TEXT NOT NULL DEFAULT 'WAITING',
        queue_alert_eligible INTEGER NOT NULL DEFAULT 0,
        queue_alert_status TEXT NOT NULL DEFAULT 'NONE',
        customer_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        served_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS loan_prescreenings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        applicant_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        account_number TEXT NOT NULL,
        collateral_type TEXT NOT NULL,
        asset_value REAL NOT NULL,
        estimated_loan REAL NOT NULL,
        loan_type TEXT NOT NULL,
        risk_tier TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        customer_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TEXT,
        reviewed_by INTEGER,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_info TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'UNREAD',
        branch_code TEXT NOT NULL DEFAULT 'ORB-BAB01',
        customer_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        Object.entries(ADMIN_ACCOUNTS).forEach(([role, account]) => {
            const hash = hashPassword(account.password);
            db.run(
                'INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role',
                [account.username, hash, role]
            );
        });
    });
}

module.exports = {
    db,
    DB_PATH,
    isVercel,
    SESSION_TTL_MS,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_LOCKOUT_MS,
    ADMIN_ACCOUNTS,
    hashPassword,
    createToken,
    runSql,
    getSql,
    allSql,
    initializeDatabase
};
