
import * as React from 'react';
import { useState } from 'react';
import { apiService } from '../services/api';

interface LoginProps {
  onLogin: (user: { email: string, role: 'ADMIN' | 'TECHNICIAN', name: string }) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, isDark, toggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userData = await apiService.login(username, password);
      onLogin(userData);
    } catch (err: any) {
      console.error("Access blocked:", err);
      setError(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 dark:bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 transition-all hover:scale-110 active:scale-95"
          >
            <i className={`fas ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-600'}`}></i>
          </button>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300">
          <div className="p-8 md:p-10">
            <div className="flex flex-col items-center mb-10">
              <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-blue-600/30">
                <i className="fas fa-network-wired"></i>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">GNET Access</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mt-2">Security Portal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                  <i className="fas fa-exclamation-circle text-lg"></i>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Email / Username</label>
                <div className="relative group">
                  <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
                  <input
                    required
                    type="text"
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Security Key (Password)</label>
                <div className="relative group">
                  <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl py-4 font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl hover:shadow-blue-500/20 flex items-center justify-center space-x-3 group disabled:opacity-70"
              >
                {isLoading ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <span>Initialize Session</span>
                    <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/30 p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center space-x-4 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              <span className="flex items-center"><i className="fas fa-shield-halved mr-2"></i> Encrypted</span>
              <div className="h-1 w-1 rounded-full bg-slate-300"></div>
              <span className="flex items-center"><i className="fas fa-server mr-2"></i> GNet Solutions</span>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
          Authorized Personnel Only • v2.1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
