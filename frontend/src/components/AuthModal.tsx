import React, { useState } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { Shield, Mail, Lock, User as UserIcon, RefreshCw, Cpu } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(`runner_${Math.floor(Math.random() * 100)}`);
  
  const { login, register, authLoading, authError } = useBattleStore();

  const handleRandomizeAvatar = () => {
    setAvatarSeed(`runner_${Math.floor(Math.random() * 1000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(email, password);
    } else {
      await register(username, email, password, avatarSeed);
    }
  };

  // Modern dicebear-style robot SVG generator based on seed
  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0f172a`;
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 glass-panel p-8 rounded-2xl relative overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-500/5">
      {/* Decorative neon background grids */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
      
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex p-3 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-purple-400 mb-3 shadow-inner">
          <Cpu className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white bg-clip-text">
          POIRO BATTLE ARENA
        </h2>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
          AI Creative Multiplex Room
        </p>
      </div>

      <div className="flex border-b border-gray-800 mb-6 relative z-10">
        <button
          onClick={() => { setIsLogin(true); useBattleStore.setState({ authError: null }); }}
          className={`flex-1 pb-3 text-sm font-semibold tracking-wider uppercase transition-colors ${
            isLogin ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setIsLogin(false); useBattleStore.setState({ authError: null }); }}
          className={`flex-1 pb-3 text-sm font-semibold tracking-wider uppercase transition-colors ${
            !isLogin ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        {authError && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-lg flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {!isLogin && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Hacker Handle / Nickname
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. CyberNinja"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/70 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
              </div>
            </div>

            {/* Premium Interactive Avatar Selector */}
            <div className="p-4 bg-slate-950/40 border border-gray-900 rounded-xl flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-gray-800 relative shrink-0">
                <img
                  src={getAvatarUrl(avatarSeed)}
                  alt="Cybernetic Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Synthetic Avatar
                </span>
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold focus:outline-none transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Randomize Matrix
                </button>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Cybernetic Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              placeholder="operator@nexus.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/70 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Access Cipher
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/70 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 focus:border-purple-500/80 focus:ring-purple-500/30 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className={`w-full py-3.5 rounded-xl font-bold tracking-widest text-sm uppercase text-slate-950 transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${
            isLogin 
              ? 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
              : 'bg-purple-500 hover:bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
          } ${authLoading ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
        >
          {authLoading ? 'Synchronizing net...' : isLogin ? 'Authenticate Access' : 'Create Identity'}
        </button>
      </form>
    </div>
  );
};
