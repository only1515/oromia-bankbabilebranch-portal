const express = require('express');
const router = express.Router();
const { runSql, getSql, allSql } = require('../db');
const { authAdmin, authCustomer, requireRole, recordAudit } = require('./auth');

function isSmsConfigured() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function normalizeSmsPhone(phone) {
    const normalized = String(phone || '').trim().replace(/[\s()-]/g, '');
    if (/^0[79]\d{8}$/.test(normalized)) return `+251${normalized.slice(1)}`;
    if (/^\+251[79]\d{8}$/.test(normalized)) return normalized;
    if (/^\+[1-9]\d{7,14}$/.test(normalized)) return normalized;
    throw new Error('The ticket phone number is not in a supported international format.');
}

async function sendSms(phone, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const body = new URLSearchParams({
        To: normalizeSmsPhone(phone),
        From: fromNumber,
        Body: message,
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(8000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.message || `SMS provider returned status ${response.status}.`);
    }
}

async function notifyThirdInQueue() {
    if (!isSmsConfigured()) return 0;

    const waitingTickets = await allSql(
        `SELECT id, ticket_number, phone_number, queue_alert_eligible, queue_alert_status
         FROM tickets WHERE branch_code = ? AND status = 'WAITING' ORDER BY created_at ASC, id ASC`,
        ['ORB-BAB01']
    );
    let sentCount = 0;

    for (const [index, ticket] of waitingTickets.slice(0, 3).entries()) {
        if (!ticket.queue_alert_eligible || ticket.queue_alert_status !== 'PENDING') continue;

        const claim = await runSql(
            "UPDATE tickets SET queue_alert_status = 'SENDING' WHERE id = ? AND queue_alert_status = 'PENDING'",
            [ticket.id]
        );
        if (!claim.changes) continue;

        try {
            const position = index + 1;
            await sendSms(
                ticket.phone_number,
                `Oromia Bank: Ticket ${ticket.ticket_number} is now ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : 'rd'} in the Babile queue. Please be ready for service.`
            );
            await runSql("UPDATE tickets SET queue_alert_status = 'SENT' WHERE id = ?", [ticket.id]);
            sentCount += 1;
        } catch (error) {
            await runSql("UPDATE tickets SET queue_alert_status = 'PENDING' WHERE id = ?", [ticket.id]);
            console.error(`SMS alert failed for ticket ${ticket.ticket_number}:`, error.message);
        }
    }

    return sentCount;
}

function csvEscape(value) {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}

// POST /api/tickets/issue
router.post('/tickets/issue', authCustomer, async (req, res) => {
    const { name, phone, accountNumber, serviceType } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const normalizedAccountNumber = String(accountNumber || '').trim();
    const normalizedServiceType = String(serviceType || '').trim();

    if (!normalizedName || !normalizedPhone || !normalizedAccountNumber || !normalizedServiceType) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const ticketNumber = 'BBL-' + Math.floor(1000 + Math.random() * 9000);

        const ticket = {
            ticket_number: ticketNumber,
            branch_code: 'ORB-BAB01',
            customer_name: normalizedName,
            phone_number: normalizedPhone,
            service_type: normalizedServiceType,
            status: 'WAITING',
        };

        const result = await runSql(
            `INSERT INTO tickets (
                customer_id, ticket_number, branch_code, customer_name, phone_number, bank_account_number, service_type, status,
                queue_alert_eligible, queue_alert_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING',
                CASE WHEN (SELECT COUNT(*) FROM tickets WHERE branch_code = ? AND status = 'WAITING') >= 5 THEN 1 ELSE 0 END,
                CASE WHEN (SELECT COUNT(*) FROM tickets WHERE branch_code = ? AND status = 'WAITING') >= 5 THEN 'PENDING' ELSE 'NOT_ELIGIBLE' END
            )`,
            [req.customer.id, ticket.ticket_number, ticket.branch_code, ticket.customer_name, ticket.phone_number, normalizedAccountNumber, ticket.service_type, ticket.branch_code, ticket.branch_code]
        );

        const savedTicket = await getSql('SELECT queue_alert_eligible FROM tickets WHERE id = ?', [result.id]);
        res.json({
            success: true,
            ticket: {
                ...ticket,
                id: result.id,
                queue_alert_eligible: Boolean(savedTicket?.queue_alert_eligible),
                sms_configured: isSmsConfigured(),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/tickets/live
router.get('/tickets/live', async (req, res) => {
    try {
        const tickets = await allSql(
            `SELECT tickets.ticket_number, tickets.service_type, tickets.status,
                (SELECT COUNT(*) + 1 FROM tickets ahead
                 WHERE ahead.branch_code = tickets.branch_code AND ahead.status = 'WAITING'
                 AND (ahead.created_at < tickets.created_at OR (ahead.created_at = tickets.created_at AND ahead.id < tickets.id))
                ) AS position
             FROM tickets WHERE tickets.status = 'WAITING'
             ORDER BY tickets.created_at ASC, tickets.id ASC LIMIT 25`
        );
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/tickets/lookup
router.get('/tickets/lookup', authCustomer, async (req, res) => {
    const ticketNumber = String(req.query.ticket || '').trim();
    if (!ticketNumber) return res.status(400).json({ success: false, message: 'Ticket number is required.' });
    try {
        const ticket = await getSql(
            `SELECT t.ticket_number, t.customer_name, t.service_type, t.status, t.created_at,
                CASE WHEN t.status = 'WAITING' THEN (
                    SELECT COUNT(*) FROM tickets ahead
                    WHERE ahead.branch_code = t.branch_code AND ahead.status = 'WAITING'
                    AND (ahead.created_at < t.created_at OR (ahead.created_at = t.created_at AND ahead.id < t.id))
                ) ELSE 0 END AS customers_ahead
            FROM tickets t WHERE t.ticket_number = ? AND t.customer_id = ?`,
            [ticketNumber, req.customer.id]
        );
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/admin/tickets/:id/status
router.patch('/admin/tickets/:id/status', authAdmin, requireRole('admin', 'manager', 'cashier'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const normalized = status.toUpperCase();

    if (req.admin.role === 'cashier' && normalized !== 'SERVED') {
        return res.status(403).json({
            success: false,
            message: 'Cashiers can only mark tickets as served.'
        });
    }

    try {
        if (normalized === 'SERVED') {
            const deletedTicket = await runSql('DELETE FROM tickets WHERE id = ?', [id]);
            if (!deletedTicket.changes) {
                return res.status(404).json({ success: false, message: 'Ticket not found.' });
            }
            await recordAudit(req.admin, 'DELETE_SERVED_TICKET', 'ticket', id, 'Served ticket permanently removed.');
        } else {
            const updatedTicket = await runSql('UPDATE tickets SET status = ? WHERE id = ?', [normalized, id]);
            if (!updatedTicket.changes) {
                return res.status(404).json({ success: false, message: 'Ticket not found.' });
            }
            await recordAudit(req.admin, 'UPDATE_STATUS', 'ticket', id, `Status changed to ${normalized}`);
        }

        let smsNotificationsSent = 0;
        if (normalized === 'SERVED') {
            try {
                smsNotificationsSent = await notifyThirdInQueue();
            } catch (error) {
                console.error('Could not check queue SMS alerts:', error.message);
            }
        }
        res.json({
            success: true,
            message: normalized === 'SERVED' ? 'Ticket served and permanently removed.' : 'Ticket status updated.',
            smsNotificationsSent
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/export/tickets
router.get('/admin/export/tickets', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const rows = await allSql('SELECT ticket_number, customer_name, phone_number, bank_account_number, service_type, status, created_at FROM tickets ORDER BY created_at DESC');
        const header = ['ticket_number', 'customer_name', 'phone_number', 'bank_account_number', 'service_type', 'status', 'created_at'];
        const csvRows = [header.join(',')].concat(rows.map((row) => header.map((key) => csvEscape(row[key])).join(',')));
        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="oromia-ticket-export.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    router,
    notifyThirdInQueue
};
