import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT username, score, created_at
       FROM users
       ORDER BY score DESC, created_at ASC
       LIMIT 50`
    );
    return res.json({
      scoreboard: rows.map((row, index) => ({
        rank: index + 1,
        username: row.username,
        score: row.score,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load scoreboard' });
  }
});

export default router;
