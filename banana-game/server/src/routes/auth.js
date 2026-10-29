import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required';
  }
  const name = username.trim();
  if (name.length < 3 || name.length > 50) {
    return 'Username must be 3–50 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return 'Username may only contain letters, numbers, and underscores';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  const error = validateCredentials(username, password);
  if (error) return res.status(400).json({ error });

  const name = username.trim();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [name, passwordHash]
    );
    const user = { id: result.insertId, username: name, score: 0 };
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, score FROM users WHERE username = ?',
      [username.trim()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, username: user.username, score: user.score },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, score FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
