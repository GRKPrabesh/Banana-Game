import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ScoreboardPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api('/api/scoreboard');
        if (!cancelled) setRows(data.scoreboard || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="scoreboard-layout">
      <div className="play-intro">
        <h1>Scoreboard</h1>
        <p>Top scores across registered players (MySQL-backed).</p>
      </div>

      {error && <p className="error banner">{error}</p>}
      {loading && <p className="muted">Loading scoreboard…</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No scores yet — be the first to solve a puzzle.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.username}>
                    <td>{row.rank}</td>
                    <td>{row.username}</td>
                    <td>{row.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
