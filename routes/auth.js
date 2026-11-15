const express = require('express');
const router = express.Router();
const {
    db,
    SESSION_TTL_MS,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_LOCKOUT_MS,
    ADMIN_ACCOUNTS,
    hashPassword,
    createToken,
    runSql,
    getSql,
    allSql
} = require('../db');

function authAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    getSql(
        `SELECT s.token, s.admin_id, s.expires_at, a.username, a.role
         FROM admin_sessions s
         INNER JOIN admins a ON a.id = s.admin_id
         WHERE s.token = ? AND s.expires_at > ?`,
        [token, Date.now()]
    )
        .then((row) => {
            if (!row) {
                return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
            }

            req.admin = {
                id: row.admin_id,
                username: row.username,
                role: row.role,
            };
            next();
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: err.message });
        });
}

function authCustomer(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Customer ') ? authHeader.slice(9) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Customer login required.' });
    }

    getSql(
        `SELECT s.token, s.customer_id, s.expires_at, c.full_name, c.phone
         FROM customer_sessions s
         INNER JOIN customers c ON c.id = s.customer_id
         WHERE s.token = ? AND s.expires_at > ?`,
        [token, Date.now()]
    )
        .then((row) => {
            if (!row) return res.status(401).json({ success: false, message: 'Customer session expired or invalid.' });
            req.customer = { id: row.customer_id, fullName: row.full_name, phone: row.phone };
            next();
        })
        .catch((err) => res.status(500).json({ success: false, message: err.message }));
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This action requires one of: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
}

async function recordAudit(admin, action, entityType, entityId, details = '') {
    await runSql(
        'INSERT INTO audit_logs (admin_id, username, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
        [admin.id, admin.username, action, entityType, entityId || null, details]
    );
}

// POST /api/admin/login
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const attempt = await getSql('SELECT * FROM admin_login_attempts WHERE username = ?', [username]);
        const now = Date.now();
        if (attempt && attempt.locked_until > now) {
            const minutesLeft = Math.ceil((attempt.locked_until - now) / 60000);
            return res.status(429).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minute(s).` });
        }

        const admin = await getSql('SELECT * FROM admins WHERE username = ?', [username]);
        if (!admin || hashPassword(password) !== admin.password_hash) {
            const currentAttempts = (attempt ? attempt.attempts : 0) + 1;
            const lockedUntil = currentAttempts >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : 0;
            await runSql(
                'INSERT INTO admin_login_attempts (username, attempts, locked_until) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET attempts = ?, locked_until = ?',
                [username, currentAttempts, lockedUntil, currentAttempts, lockedUntil]
            );

            return res.status(401).json({
                success: false,
                message: currentAttempts >= MAX_LOGIN_ATTEMPTS
                    ? 'Account locked for 15 minutes due to too many failed attempts.'
                    : `Invalid credentials. Attempts left: ${MAX_LOGIN_ATTEMPTS - currentAttempts}`
            });
        }

        await runSql('DELETE FROM admin_login_attempts WHERE username = ?', [username]);
        const token = createToken();
        const expiresAt = now + SESSION_TTL_MS;
        await runSql('INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (?, ?, ?)', [admin.id, token, expiresAt]);
        await recordAudit({ id: admin.id, username: admin.username }, 'LOGIN', 'admins', admin.id, 'Admin logged in');

        res.json({
            success: true,
            token,
            expiresAt,
            admin: { id: admin.id, username: admin.username, role: admin.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/logout
router.post('/admin/logout', authAdmin, async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            await runSql('DELETE FROM admin_sessions WHERE token = ?', [token]);
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/me
router.get('/admin/me', authAdmin, (req, res) => {
    res.json({ success: true, admin: req.admin });
});

// POST /api/customer/register
router.post('/customer/register', async (req, res) => {
    const { fullName, phone, password } = req.body || {};
    if (!fullName || !phone || !password) {
        return res.status(400).json({ success: false, message: 'Full name, phone, and password are required.' });
    }
    if (String(password).length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        const existing = await getSql('SELECT id FROM customers WHERE phone = ?', [String(phone).trim()]);
        if (existing) {
            return res.status(409).json({ success: false, message: 'A customer account with this phone number already exists.' });
        }

        const passwordHash = hashPassword(password);
        const result = await runSql(
            'INSERT INTO customers (full_name, phone, password_hash) VALUES (?, ?, ?)',
            [String(fullName).trim(), String(phone).trim(), passwordHash]
        );

        const token = createToken();
        const expiresAt = Date.now() + SESSION_TTL_MS;
        await runSql('INSERT INTO customer_sessions (customer_id, token, expires_at) VALUES (?, ?, ?)', [result.id, token, expiresAt]);

        res.status(201).json({
            success: true,
            token,
            customer: { id: result.id, fullName: String(fullName).trim(), phone: String(phone).trim() }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/customer/login
router.post('/customer/login', async (req, res) => {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password are required.' });
    }

    try {
        const customer = await getSql('SELECT * FROM customers WHERE phone = ?', [String(phone).trim()]);
        if (!customer || hashPassword(password) !== customer.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });
        }

        const token = createToken();
        const expiresAt = Date.now() + SESSION_TTL_MS;
        await runSql('INSERT INTO customer_sessions (customer_id, token, expires_at) VALUES (?, ?, ?)', [customer.id, token, expiresAt]);

        res.json({
            success: true,
            token,
            customer: { id: customer.id, fullName: customer.full_name, phone: customer.phone }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/customer/logout
router.post('/customer/logout', authCustomer, async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Customer ') ? authHeader.slice(9) : null;
        if (token) {
            await runSql('DELETE FROM customer_sessions WHERE token = ?', [token]);
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/customer/me
router.get('/customer/me', authCustomer, (req, res) => {
    res.json({ success: true, customer: req.customer });
});

module.exports = {
    router,
    authAdmin,
    authCustomer,
    requireRole,
    recordAudit
};
