import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    base_currency: 'INR',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-black rounded-0 p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
          <div className="w-6 h-6 bg-red-primary" />
          <div className="w-6 h-6 rounded-full bg-blue-primary" />
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-yellow-primary" />
          <span className="text-2xl font-bold tracking-tight lowercase ml-2">headroom</span>
        </div>

        <h2 className="text-xl font-bold lowercase mb-2">create account</h2>
        <p className="text-xs text-ink-500 lowercase mb-6">
          forward-looking cash projection and headroom forecasting
        </p>

        {error && (
          <div className="p-3 bg-red-primary text-white text-xs font-medium mb-4 border-2 border-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="full name"
            required
            placeholder="Riya Sharma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="email address"
            type="email"
            required
            placeholder="riya@university.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            label="password (at least 12 characters)"
            type="password"
            required
            placeholder="••••••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium lowercase">base currency</label>
            <select
              className="h-12 px-3 border-2 border-black bg-white lowercase text-sm"
              value={form.base_currency}
              onChange={(e) => setForm({ ...form, base_currency: e.target.value })}
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ US Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
            </select>
          </div>

          <Button variant="primary" size="large" type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'creating account...' : 'register'}
          </Button>
        </form>

        <p className="text-xs text-center text-ink-500 lowercase mt-6">
          already have an account?{' '}
          <Link to="/login" className="text-black font-semibold underline">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
