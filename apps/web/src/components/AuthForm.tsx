import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Lock, User, Mail, Brain, ShieldCheck } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setToken = useAuthStore((state) => state.setToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Login failed');
        }

        const data = await response.json();
        setToken(data.access_token);
      } else {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, username, password }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed');
        }

        // Auto login after register
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const loginResponse = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          setToken(data.access_token);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#090A0F] text-white p-4">
      <div className="w-full max-w-sm p-6 bg-[#0F1117] border border-[#1F2433] rounded-lg shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-[#1F2433] pb-4">
          <div className="p-2 bg-[#18162B] border border-[#302856] rounded-md text-teal-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono tracking-wide">
              {isLogin ? 'Neuro Workstation Authentication' : 'Create Vault Identity'}
            </h2>
            <p className="text-[10px] text-[#64748B] font-mono">
              {isLogin ? 'Sign in to access your local neural vault' : 'Establish local encryption & identity'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 text-xs font-mono text-rose-300 bg-[#2B1215] border border-[#521C24] rounded-md">
            {error}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-[#64748B]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-8 pr-3 py-1.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                  placeholder="operator@neuro.local"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] mb-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <User className="h-3.5 w-3.5 text-[#64748B]" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-8 pr-3 py-1.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                placeholder="root"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] mb-1">Secret Key / Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Lock className="h-3.5 w-3.5 text-[#64748B]" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-8 pr-3 py-1.5 bg-[#090A0F] border border-[#242A3C] rounded-md text-xs text-white placeholder-[#475569] focus:outline-none focus:border-teal-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md font-mono text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50 mt-4"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{loading ? 'Authenticating...' : (isLogin ? 'Sign In to Vault' : 'Initialize Vault')}</span>
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#1F2433]">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[11px] font-mono text-[#94A3B8] hover:text-white transition-colors"
          >
            {isLogin ? "Don't have a vault profile? Create one" : 'Already have a profile? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
