const express = require('express');
const router = express.Router();
const { runSql, getSql, allSql, hashPassword } = require('../db');
const { authAdmin, requireRole, recordAudit } = require('./auth');

// GET /api/branch/status
router.get('/branch/status', async (req, res) => {
    try {
        const branch = await getSql('SELECT * FROM branches WHERE branch_code = ?', ['ORB-BAB01']);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }
        res.json({ success: true, branch });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/admin/branch
router.patch('/admin/branch', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    const { status, avgWaitMinutes, activeCounters } = req.body || {};
    if (!status || !Number.isInteger(Number(avgWaitMinutes)) || !activeCounters) {
        return res.status(400).json({ success: false, message: 'Branch status, wait time, and active counters are required.' });
    }
    try {
        await runSql(
            'UPDATE branches SET status = ?, avg_wait_minutes = ?, active_counters = ?, updated_at = CURRENT_TIMESTAMP WHERE branch_code = ?',
            [status.toUpperCase(), Number(avgWaitMinutes), activeCounters, 'ORB-BAB01']
        );
        await recordAudit(req.admin, 'UPDATE_BRANCH', 'branch', 1, `${status}, ${avgWaitMinutes} minutes, ${activeCounters}`);
        res.json({ success: true, message: 'Branch settings saved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/dashboard
router.get('/admin/dashboard', authAdmin, requireRole('admin', 'manager', 'cashier'), async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || '').trim().toUpperCase();
        const pattern = `%${search}%`;
        const ticketConditions = [];
        if (search) ticketConditions.push('(customer_name LIKE ? OR phone_number LIKE ? OR ticket_number LIKE ?)');
        if (status) {
            ticketConditions.push('status = ?');
        } else {
            ticketConditions.push("status = 'WAITING'");
        }
        const ticketWhere = ticketConditions.length ? `WHERE ${ticketConditions.join(' AND ')}` : '';
        const ticketParams = [
            ...(search ? [pattern, pattern, pattern] : []),
            ...(status ? [status] : [])
        ];
        const queueOrder = status === 'SERVED' ? 'created_at DESC, id DESC' : 'created_at ASC, id ASC';
        const [queue, loans, branch, ticketTotals, waitingTotals, serviceBreakdown, dailyTickets, approvals] = await Promise.all([
            allSql(
                `SELECT tickets.*,
                    CASE WHEN status = 'WAITING' THEN (
                        SELECT COUNT(*) + 1 FROM tickets ahead
                        WHERE ahead.branch_code = tickets.branch_code AND ahead.status = 'WAITING'
                        AND (ahead.created_at < tickets.created_at OR (ahead.created_at = tickets.created_at AND ahead.id < tickets.id))
                    ) ELSE NULL END AS queue_position
                 FROM tickets ${ticketWhere} ORDER BY ${queueOrder} LIMIT 50`,
                ticketParams
            ),
            allSql(`SELECT * FROM loan_prescreenings ${search ? 'WHERE applicant_name LIKE ? OR phone LIKE ?' : ''} ORDER BY created_at DESC LIMIT 50`, search ? [pattern, pattern] : []),
            getSql('SELECT * FROM branches WHERE branch_code = ?', ['ORB-BAB01']),
            getSql('SELECT COUNT(*) AS total FROM tickets'),
            getSql('SELECT COUNT(*) AS total FROM tickets WHERE status = ?', ['WAITING']),
            allSql('SELECT service_type, COUNT(*) AS value FROM tickets GROUP BY service_type ORDER BY value DESC LIMIT 5'),
            allSql(`SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM tickets GROUP BY day ORDER BY day DESC LIMIT 7`),
            getSql('SELECT COUNT(*) AS total FROM loan_prescreenings WHERE status = ?', ['APPROVED'])
        ]);

        const pendingCount = queue.filter((item) => item.status === 'WAITING').length;
        const analytics = {
            totalTickets: Number(ticketTotals?.total || 0),
            waitingTickets: Number(waitingTotals?.total || 0),
            avgWaitMinutes: Number(branch?.avg_wait_minutes || 0),
            branchStatus: branch?.status || 'ONLINE',
            serviceBreakdown: serviceBreakdown.map((item) => ({
                label: item.service_type,
                value: Number(item.value || 0),
            })),
            trend: dailyTickets.map((item) => ({
                day: item.day,
                total: Number(item.total || 0),
                served: Number(item.served || 0),
            })),
            approvedLoanCount: Number(approvals?.total || 0),
        };

        res.json({
            success: true,
            admin: req.admin,
            waitingCount: pendingCount,
            loanCount: loans.length,
            branch,
            dailyTickets,
            audit: await allSql('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20'),
            analytics,
            queue: queue.map((item) => ({
                id: item.id,
                name: item.customer_name,
                phone: item.phone_number,
                service: item.service_type,
                status: item.status === 'WAITING' ? 'Waiting' : 'Served',
                position: item.queue_position,
            })),
            loans: loans.map((item) => ({
                id: item.id,
                name: item.applicant_name,
                phone: item.phone,
                amount: Number(item.estimated_loan),
                status: item.status === 'APPROVED' ? 'Approved' : 'Review',
            })),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/password
router.post('/admin/password', authAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Current password and a new password of at least 8 characters are required.' });
    }

    try {
        const admin = await getSql('SELECT password_hash FROM admins WHERE id = ?', [req.admin.id]);
        if (!admin || admin.password_hash !== hashPassword(currentPassword)) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }
        await runSql('UPDATE admins SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.admin.id]);
        await recordAudit(req.admin, 'CHANGE_PASSWORD', 'admin', req.admin.id);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/audit
router.get('/admin/audit', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    try {
        res.json({ success: true, audit: await allSql('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100') });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/contact-messages
router.post('/contact-messages', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const contact = String(req.body?.contact || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!name || name.length > 100 || contact.length > 120 || !message || message.length > 2000) {
        return res.status(400).json({ success: false, message: 'Please provide a name and a message under 2,000 characters.' });
    }

    try {
        const result = await runSql(
            'INSERT INTO contact_messages (name, contact, message) VALUES (?, ?, ?)',
            [name, contact, message]
        );
        res.status(201).json({ success: true, id: result.id, message: 'Your message was sent to the branch manager.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/contact-messages
router.get('/admin/contact-messages', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const messages = await allSql(
            'SELECT id, name, contact, message, read_at, created_at FROM contact_messages ORDER BY read_at IS NULL DESC, created_at DESC LIMIT 200'
        );
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/admin/contact-messages/:id/read
router.patch('/admin/contact-messages/:id/read', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: 'A valid message ID is required.' });
    }

    try {
        const result = await runSql(
            'UPDATE contact_messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND read_at IS NULL',
            [id]
        );
        if (!result.changes) {
            const existing = await getSql('SELECT id FROM contact_messages WHERE id = ?', [id]);
            if (!existing) return res.status(404).json({ success: false, message: 'Message not found.' });
        } else {
            await recordAudit(req.admin, 'READ_CONTACT_MESSAGE', 'contact_message', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    router
};
