require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, ADMIN_ACCOUNTS } = require('./db');
const { router: authRouter } = require('./routes/auth');
const { router: queueRouter } = require('./routes/queue');
const { router: loansRouter } = require('./routes/loans');
const { router: branchRouter } = require('./routes/branch');

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Mount routes
app.use('/api', authRouter);
app.use('/api', queueRouter);
app.use('/api', loansRouter);
app.use('/api', branchRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Initialize database
initializeDatabase();

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Oromia Bank Backend running on port ${PORT}`);
        console.log(`Default admin accounts: admin / ${ADMIN_ACCOUNTS.admin.password}, manager / ${ADMIN_ACCOUNTS.manager.password}, cashier / ${ADMIN_ACCOUNTS.cashier.password}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const nextPort = Number(PORT) + 1;
            console.warn(`Port ${PORT} is already in use. Retrying on port ${nextPort}...`);
            const fallbackServer = app.listen(nextPort, () => {
                console.log(`Oromia Bank Backend running on port ${nextPort}`);
                console.log(`Default admin accounts: admin / ${ADMIN_ACCOUNTS.admin.password}, manager / ${ADMIN_ACCOUNTS.manager.password}, cashier / ${ADMIN_ACCOUNTS.cashier.password}`);
            });
            fallbackServer.on('error', (e) => console.error('Fallback server error:', e));
        } else {
            console.error('Server error:', err);
        }
    });
}

module.exports = app;
