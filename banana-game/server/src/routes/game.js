import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const POINTS_CORRECT = 10;
const HINT_PENALTY = 2; // deducted from points awarded on a correct answer (min 1)

function buildHint(solution, level) {
  const text = String(solution);
  if (level === 1) {
    return {
      level: 1,
      message: `The answer has ${text.length} digit${text.length === 1 ? '' : 's'}.`,
    };
  }
  if (level === 2) {
    return {
      level: 2,
      message: `The first digit is ${text[0]}.`,
    };
  }
  if (level >= 3) {
    const n = Number(text);
    const parity = Number.isFinite(n) && n % 2 === 0 ? 'even' : 'odd';
    return {
      level: 3,
      message: `The answer is an ${parity} number.`,
    };
  }
  return null;
}

async function fetchBananaQuestion() {
  const url = process.env.BANANA_API_URL || 'https://marcconrad.com/uob/banana/api.php';
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Banana API HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data?.question || data.solution === undefined || data.solution === null) {
    throw new Error('Banana API returned an unexpected payload');
  }
  return {
    question: String(data.question),
    solution: String(data.solution),
  };
}

router.post('/start', requireAuth, async (req, res) => {
  try {
    const banana = await fetchBananaQuestion();
    const roundId = crypto.randomUUID();

    await pool.execute(
      `INSERT INTO game_rounds (id, user_id, question_url, solution, hint_level)
       VALUES (?, ?, ?, ?, 0)`,
      [roundId, req.user.id, banana.question, banana.solution]
    );

    return res.json({
      roundId,
      question: banana.question,
      hintLevel: 0,
      maxHints: 3,
      scoring: {
        correctPoints: POINTS_CORRECT,
        hintPenalty: HINT_PENALTY,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'Could not fetch a new question' });
  }
});

router.post('/hint', requireAuth, async (req, res) => {
  const { roundId } = req.body || {};
  if (!roundId) return res.status(400).json({ error: 'roundId is required' });

  try {
    const [rows] = await pool.execute(
      `SELECT id, solution, hint_level, answered
       FROM game_rounds WHERE id = ? AND user_id = ?`,
      [roundId, req.user.id]
    );
    const round = rows[0];
    if (!round) return res.status(404).json({ error: 'Round not found' });
    if (round.answered) {
      return res.status(400).json({ error: 'This round is already finished' });
    }

    const nextLevel = Math.min(3, Number(round.hint_level) + 1);
    if (Number(round.hint_level) >= 3) {
      return res.json({
        hint: buildHint(round.solution, 3),
        hintLevel: 3,
        maxHints: 3,
        exhausted: true,
      });
    }

    await pool.execute(
      'UPDATE game_rounds SET hint_level = ? WHERE id = ?',
      [nextLevel, roundId]
    );

    return res.json({
      hint: buildHint(round.solution, nextLevel),
      hintLevel: nextLevel,
      maxHints: 3,
      exhausted: nextLevel >= 3,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not generate hint' });
  }
});

router.post('/answer', requireAuth, async (req, res) => {
  const { roundId, answer } = req.body || {};
  if (!roundId) return res.status(400).json({ error: 'roundId is required' });
  if (answer === undefined || answer === null || String(answer).trim() === '') {
    return res.status(400).json({ error: 'answer is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, solution, hint_level, answered
       FROM game_rounds WHERE id = ? AND user_id = ? FOR UPDATE`,
      [roundId, req.user.id]
    );
    const round = rows[0];
    if (!round) {
      await connection.rollback();
      return res.status(404).json({ error: 'Round not found' });
    }
    if (round.answered) {
      await connection.rollback();
      return res.status(400).json({ error: 'This round is already finished' });
    }

    const correct =
      String(answer).trim().toLowerCase() === String(round.solution).trim().toLowerCase();

    let pointsAwarded = 0;
    if (correct) {
      pointsAwarded = Math.max(1, POINTS_CORRECT - Number(round.hint_level) * HINT_PENALTY);
      await connection.execute(
        'UPDATE users SET score = score + ? WHERE id = ?',
        [pointsAwarded, req.user.id]
      );
      await connection.execute(
        'INSERT INTO score_events (user_id, round_id, points) VALUES (?, ?, ?)',
        [req.user.id, roundId, pointsAwarded]
      );
    }

    await connection.execute(
      `UPDATE game_rounds
       SET answered = 1, correct = ?, answered_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [correct ? 1 : 0, roundId]
    );

    const [userRows] = await connection.execute(
      'SELECT score FROM users WHERE id = ?',
      [req.user.id]
    );

    await connection.commit();

    return res.json({
      correct,
      pointsAwarded,
      totalScore: userRows[0]?.score ?? 0,
      solution: correct ? undefined : String(round.solution),
      hintLevelUsed: Number(round.hint_level),
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Could not submit answer' });
  } finally {
    connection.release();
  }
});

export default router;
