import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setEmail('riya@student.edu');
    setPassword('Password123!');
    setLoading(true);
    try {
      await login('riya@student.edu', 'Password123!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-black rounded-0 p-8 max-w-md w-full relative">
        {/* Bauhaus geometric poster motif (permitted on login per Design System 14) */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
          <div className="w-6 h-6 bg-red-primary" />
          <div className="w-6 h-6 rounded-full bg-blue-primary" />
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-yellow-primary" />
          <span className="text-2xl font-bold tracking-tight lowercase ml-2">headroom</span>
        </div>

        <h2 className="text-xl font-bold lowercase mb-2">welcome back</h2>
        <p className="text-xs text-ink-500 lowercase mb-6">
          see how much month you have left at the end of your money.
        </p>

        {error && (
          <div className="p-3 bg-red-primary text-white text-xs font-medium mb-4 border-2 border-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="email address"
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="password"
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button variant="primary" size="large" type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'logging in...' : 'log in'}
          </Button>
        </form>

        {/* Test account shortcut */}
        <div className="mt-6 pt-4 border-t-2 border-black flex flex-col gap-2">
          <span className="text-[11px] text-ink-500 lowercase">quick test login:</span>
          <Button variant="secondary" size="small" onClick={handleTestLogin} className="w-full">
            log in as riya (seed test user)
          </Button>
        </div>

        <p className="text-xs text-center text-ink-500 lowercase mt-6">
          new to headroom?{' '}
          <Link to="/register" className="text-black font-semibold underline">
            create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
