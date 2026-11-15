const express = require('express');
const router = express.Router();
const { runSql, getSql, allSql } = require('../db');
const { authAdmin, authCustomer, requireRole, recordAudit } = require('./auth');

function csvEscape(value) {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}

// POST /api/loans/prescreen
router.post('/loans/prescreen', authCustomer, async (req, res) => {
    const { name, phone, loanType, assetValue } = req.body || {};

    if (!name || !phone || !loanType || !assetValue) {
        return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    try {
        const estimatedLoan = Number(assetValue) * 0.60;
        const result = await runSql(
            'INSERT INTO loan_prescreenings (customer_id, applicant_name, phone, loan_type, asset_value, estimated_loan, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.customer.id, name, phone, loanType, Number(assetValue), estimatedLoan, 'PENDING']
        );

        res.json({
            success: true,
            result: {
                id: result.id,
                applicant_name: name,
                phone,
                loan_type: loanType,
                asset_value: Number(assetValue),
                estimated_loan: estimatedLoan,
                status: 'PENDING',
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/loans/lookup
router.get('/loans/lookup', authCustomer, async (req, res) => {
    const id = Number(req.query.id);
    const phone = String(req.query.phone || '').trim();
    if (!id && !phone) return res.status(400).json({ success: false, message: 'Application ID or phone number is required.' });
    try {
        const loan = await getSql(
            `SELECT id, applicant_name, phone, loan_type, estimated_loan, status, created_at
            FROM loan_prescreenings WHERE customer_id = ? AND ${id ? 'id = ?' : 'phone = ?'} ORDER BY created_at DESC LIMIT 1`,
            [req.customer.id, id || phone]
        );
        if (!loan) return res.status(404).json({ success: false, message: 'Loan application not found.' });
        res.json({ success: true, loan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/admin/loans/:id/status
router.patch('/admin/loans/:id/status', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    try {
        await runSql('UPDATE loan_prescreenings SET status = ? WHERE id = ?', [status.toUpperCase(), id]);
        await recordAudit(req.admin, 'UPDATE_STATUS', 'loan', id, `Status changed to ${status.toUpperCase()}`);
        res.json({ success: true, message: 'Loan status updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/export/loan-approvals
router.get('/admin/export/loan-approvals', authAdmin, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const rows = await allSql(
            'SELECT applicant_name, phone, loan_type, asset_value, estimated_loan, status, created_at FROM loan_prescreenings WHERE status = ? ORDER BY created_at DESC',
            ['APPROVED']
        );
        const header = ['applicant_name', 'phone', 'loan_type', 'asset_value', 'estimated_loan', 'status', 'created_at'];
        const csvRows = [header.join(',')].concat(rows.map((row) => header.map((key) => csvEscape(row[key])).join(',')));
        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="oromia-loan-approvals.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = {
    router
};
