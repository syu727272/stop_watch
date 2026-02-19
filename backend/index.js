const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS laps (
        id SERIAL PRIMARY KEY,
        lap_time BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized.');
  } catch (err) {
    console.error('Error initializing database', err.stack);
  }
};

app.use(cors());
app.use(express.json());

// In-memory stopwatch state
let stopwatch = {
  startTime: null,
  elapsedTime: 0,
  isRunning: false,
};

// API Endpoints
app.get('/api/time', (req, res) => {
    const elapsed = stopwatch.isRunning
        ? stopwatch.elapsedTime + (Date.now() - stopwatch.startTime)
        : stopwatch.elapsedTime;
    res.json({ elapsedTime: elapsed });
});

app.post('/api/start', (req, res) => {
  if (!stopwatch.isRunning) {
    stopwatch.startTime = Date.now();
    stopwatch.isRunning = true;
  }
  res.json({ message: 'Stopwatch started.' });
});

app.post('/api/stop', (req, res) => {
  if (stopwatch.isRunning) {
    stopwatch.elapsedTime += Date.now() - stopwatch.startTime;
    stopwatch.isRunning = false;
    stopwatch.startTime = null;
  }
  res.json({ message: 'Stopwatch stopped.' });
});

// リセット時にDBのlapsも全削除
app.post('/api/reset', async (req, res) => {
  stopwatch.startTime = null;
  stopwatch.elapsedTime = 0;
  stopwatch.isRunning = false;
  try {
    await pool.query('DELETE FROM laps');
    res.json({ message: 'Stopwatch reset and laps cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ラップ一覧取得
app.get('/api/laps', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM laps ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ラップ記録
app.post('/api/laps', async (req, res) => {
    const elapsed = stopwatch.isRunning
        ? stopwatch.elapsedTime + (Date.now() - stopwatch.startTime)
        : stopwatch.elapsedTime;

    if (elapsed > 0) {
        try {
            const { rows } = await pool.query(
              'INSERT INTO laps (lap_time) VALUES ($1) RETURNING *',
              [elapsed]
            );
            res.status(201).json(rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.status(400).json({ error: 'Stopwatch is not running or has not started.'});
    }
});

// ラップ個別削除
app.delete('/api/laps/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM laps WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Lap not found' });
        }
        res.json({ message: 'Lap deleted.', lap: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, async () => {
  await initDb();
  console.log(`Backend server listening at http://localhost:${port}`);
});
