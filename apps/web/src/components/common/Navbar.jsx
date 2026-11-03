import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: 'dashboard' },
    { to: '/ledger', label: 'ledger' },
    { to: '/import', label: 'smart import' },
    { to: '/groups', label: 'groups' },
    { to: '/budgets', label: 'budgets' },
  ];

  return (
    <header className="h-16 bg-black text-white px-6 flex items-center justify-between border-b-2 border-black sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-8">
        <NavLink to="/" className="text-2xl font-medium tracking-tight text-white lowercase">
          headroom
        </NavLink>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-1 lowercase transition-none ${
                  isActive
                    ? 'bg-blue-primary text-white border-2 border-black'
                    : 'text-ink-300 hover:text-white hover:bg-ink-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User / Auth */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-300 hidden sm:inline lowercase">
              {user.name} ({user.base_currency})
            </span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-xs text-ink-300 hover:text-white underline lowercase cursor-pointer"
            >
              log out
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="text-sm text-white hover:underline lowercase">
            log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
