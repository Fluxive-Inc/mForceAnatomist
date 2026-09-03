require('dotenv').config();
const express = require('express');
const db = require('./db');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sessionLogin, requireAuth } = require('./perimeter-guard');

const app = express();
app.use(cookieParser());
app.use(express.json());

app.get('/api/v1/health', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'success', db_time: result.rows[0].now });
    } catch (err) {
        console.error('DB Connection Error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});


const PORT = process.env.PORT || 8080;
// Note: In an Angular app, the built files are in dist/browser or dist/[app-name]
// We will assume 'dist' for simplicity, modify per app if needed
const DIST_DIR = path.join(__dirname, 'dist'); 

// 1. Unauthenticated Perimeter
app.get('/', (req, res) => {
    if (req.cookies.__session) {
        return res.redirect('/app');
    }
    res.sendFile(path.join(__dirname, 'perimeter.html'));
});

// 2. Auth Handshake
app.post('/sessionLogin', sessionLogin);

// 3. Authenticated App Entry
app.get('/app', requireAuth, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// 4. Static Assets & Catch-All
app.use(express.static(DIST_DIR, { index: false }));

app.get('*', requireAuth, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS anatomical_terms (
                id SERIAL PRIMARY KEY, term VARCHAR(255) NOT NULL, definition TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database schema initialized for anatomical_terms.');
    } catch (err) {
        console.error('Failed to initialize database schema:', err);
    }
    console.log(`mForce Perimeter active on port ${PORT}`);
});

app.get('/api/v1/anatomical_terms', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM anatomical_terms ORDER BY 1 DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch anatomical_terms' });
    }
});

app.post('/api/v1/anatomical_terms', requireAuth, async (req, res) => {
    try {
        const { term, definition } = req.body;
        const result = await db.query(
            'INSERT INTO anatomical_terms (term, definition) VALUES ($1, $2) RETURNING *',
            [term, definition]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create anatomical_terms' });
    }
});

app.put('/api/v1/anatomical_terms/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { term, definition } = req.body;
        const result = await db.query(
            'UPDATE anatomical_terms SET term = COALESCE($1, term), definition = COALESCE($2, definition) WHERE id = $3 RETURNING *',
            [term, definition, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update anatomical_terms' });
    }
});

app.delete('/api/v1/anatomical_terms/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM anatomical_terms WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ status: 'success', deleted: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete anatomical_terms' });
    }
});
