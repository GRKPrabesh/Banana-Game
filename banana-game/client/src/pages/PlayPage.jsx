import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext.jsx';

export default function PlayPage() {
  const { updateScore } = useAuth();
  const [round, setRound] = useState(null);
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function startRound() {
    setError('');
    setResult(null);
    setHint(null);
    setAnswer('');
    setBusy(true);
    try {
      const data = await api('/api/game/start', { method: 'POST', auth: true });
      setRound(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestHint() {
    if (!round?.roundId) return;
    setError('');
    setBusy(true);
    try {
      const data = await api('/api/game/hint', {
        method: 'POST',
        auth: true,
        body: { roundId: round.roundId },
      });
      setHint(data.hint);
      setRound((prev) =>
        prev ? { ...prev, hintLevel: data.hintLevel } : prev
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(e) {
    e.preventDefault();
    if (!round?.roundId) return;
    setError('');
    setBusy(true);
    try {
      const data = await api('/api/game/answer', {
        method: 'POST',
        auth: true,
        body: { roundId: round.roundId, answer },
      });
      setResult(data);
      updateScore(data.totalScore);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const finished = Boolean(result);

  return (
    <section className="play-layout">
      <div className="play-intro">
        <h1>Play</h1>
        <p>
          Questions are fetched server-side from the Banana API. Correct answers
          earn up to 10 points; each hint costs 2 points from that round.
        </p>
      </div>

      {error && <p className="error banner">{error}</p>}

      {!round && (
        <button type="button" className="primary-wide" onClick={startRound} disabled={busy}>
          {busy ? 'Fetching puzzle…' : 'Start a new puzzle'}
        </button>
      )}

      {round && (
        <div className="play-stage">
          <figure className="question-frame">
            <img src={round.question} alt="Banana puzzle question" />
          </figure>

          <div className="play-controls">
            {!finished ? (
              <>
                <form onSubmit={submitAnswer} className="answer-form">
                  <label>
                    Your answer
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      inputMode="numeric"
                      autoFocus
                      required
                    />
                  </label>
                  <button type="submit" disabled={busy}>
                    Submit
                  </button>
                </form>

                <div className="hint-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={requestHint}
                    disabled={busy || (round.hintLevel ?? 0) >= 3}
                  >
                    Hint ({round.hintLevel ?? 0}/3)
                  </button>
                  {hint && <p className="hint-bubble">{hint.message}</p>}
                </div>
              </>
            ) : (
              <div className={`result-panel ${result.correct ? 'ok' : 'bad'}`}>
                <p className="result-title">
                  {result.correct ? 'Correct!' : 'Not quite'}
                </p>
                <p>
                  {result.correct
                    ? `+${result.pointsAwarded} points`
                    : `Answer was ${result.solution}`}
                </p>
                <p className="muted">Total score: {result.totalScore}</p>
                <button type="button" onClick={startRound} disabled={busy}>
                  Next puzzle
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
