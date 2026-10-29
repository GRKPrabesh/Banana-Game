import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ScoreboardPage from './pages/ScoreboardPage.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="panel muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <div className="bg-glow" aria-hidden="true" />
      <header className="topbar">
        <NavLink to={user ? '/play' : '/'} className="brand">
          Banana Quest
        </NavLink>
        <nav className="nav">
          {user ? (
            <>
              <NavLink to="/play">Play</NavLink>
              <NavLink to="/scoreboard">Scoreboard</NavLink>
              <span className="user-chip">
                {user.username} · {user.score} pts
              </span>
              <button type="button" className="ghost-btn" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register" className="cta-link">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={user ? '/play' : '/login'} replace />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/play"
            element={
              <Protected>
                <PlayPage />
              </Protected>
            }
          />
          <Route path="/scoreboard" element={<ScoreboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
