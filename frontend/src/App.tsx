import { useEffect } from 'react';
import { useBattleStore } from './store/useBattleStore';
import { AuthModal } from './components/AuthModal';
import { CreateJoinRoom } from './components/CreateJoinRoom';
import { ActiveBattle } from './components/ActiveBattle';
import { Sparkles, Activity, AlertCircle, X, ShieldCheck } from 'lucide-react';
import './App.css';

function App() {
  const {
    token, user, room, initAuth, toastMessage, clearToast
  } = useBattleStore();

  // Restore session on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Self-dismissing toast notifications
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 flex flex-col font-sans relative overflow-x-hidden select-none selection:bg-purple-500/30 selection:text-white">

      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-purple-950/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-cyan-950/10 blur-[150px] pointer-events-none" />

      {/* Cyber Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #4b5563 1px, transparent 1px),
            linear-gradient(to bottom, #4b5563 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Header */}
      <header className="w-full bg-[#0a0f1d]/80 border-b border-gray-900/60 backdrop-blur-md relative z-30 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-lg text-slate-950 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">
                POIRO <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">CREATIVE</span>
              </h1>
              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider block mt-0.5">
                AI Battle Arena Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-gray-900 rounded-xl">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Telemetry Grid: <strong className="text-white">Active</strong>
              </span>
            </div>

            {user && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-gray-900">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 border border-purple-500/20">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatar_seed}&backgroundColor=0f172a`}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <span className="block text-xs font-bold text-white leading-none">{user.username}</span>
                  <span className="text-[9px] text-gray-500 font-medium">Sync Active</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full relative z-20 flex flex-col justify-center py-6">
        {!token || !user ? (
          <AuthModal />
        ) : !room.room_id ? (
          <CreateJoinRoom />
        ) : (
          <ActiveBattle />
        )}
      </main>

      {/* Footer Details */}
      <footer className="w-full bg-[#05080f] py-4 border-t border-gray-900/60 relative z-30 shrink-0 text-center">
        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
          Poiro Creative Battle Room
        </span>
      </footer>

      {/* Real-time Toast Alerts Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 max-w-sm ${toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-emerald-500/5'
              : toastMessage.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-300 shadow-red-500/5'
                : 'bg-slate-950/90 border-purple-500/30 text-purple-300 shadow-purple-500/5'
            }`}>
            <div className="shrink-0 mt-0.5">
              {toastMessage.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Activity className="w-4 h-4 text-purple-400" />
              )}
            </div>

            <div className="flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white mb-0.5">
                {toastMessage.type === 'success' ? 'Telemetry Success' : toastMessage.type === 'error' ? 'Security Alert' : 'System Notice'}
              </span>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                {toastMessage.text}
              </p>
            </div>

            <button
              onClick={clearToast}
              className="p-1 border border-transparent hover:border-gray-800 hover:text-white rounded-lg transition-all focus:outline-none shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
