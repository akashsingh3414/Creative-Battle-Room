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
    <div className="min-h-screen bg-[#0b1416] text-[#d7dadc] flex flex-col font-sans relative select-none selection:bg-[#ff4500]/25 selection:text-white">

      {/* Main Header */}
      <header className="w-full bg-[#122326] border-b border-[#2a3c42] relative z-30 shrink-0 shadow-md shadow-black/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ff4500] rounded-lg text-white shadow-md shadow-[#ff4500]/25">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-widest uppercase">
                POIRO <span className="text-[#ff4500]">CREATIVE</span>
              </h1>
              <span className="text-[10px] text-[#8797a1] font-bold uppercase tracking-wider block mt-0.5">
                AI Battle Arena Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl">
              <Activity className="w-4 h-4 text-[#ff4500] animate-pulse" />
              <span className="text-xs text-[#8797a1] font-bold uppercase tracking-wider">
                Telemetry Grid: <strong className="text-white">Active</strong>
              </span>
            </div>

            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-[#2a3c42]">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#1a2a2d] border border-[#2a3c42]">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatar_seed}&backgroundColor=122326`}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <span className="block text-sm font-bold text-white leading-none">{user.username}</span>
                  <span className="text-[10px] text-[#8797a1] font-semibold block mt-1">Sync Active</span>
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
      <footer className="w-full bg-[#122326] py-2 border-t border-[#2a3c42] relative z-30 shrink-0 text-center">
        <span className="text-[10px] text-[#8797a1] font-bold uppercase tracking-widest">
          Poiro Creative Battle Room — Dark Edition
        </span>
      </footer>

      {/* Real-time Toast Alerts Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 max-w-sm ${
            toastMessage.type === 'success'
              ? 'bg-[#122b21] border-[#1e5237] text-[#8ce0b0] shadow-black/40'
              : toastMessage.type === 'error'
                ? 'bg-[#2d1215] border-[#5a1c22] text-[#ff8c95] shadow-black/40'
                : 'bg-[#122326] border-[#2a3c42] text-[#ff4500] shadow-black/40'
          }`}>
            <div className="shrink-0 mt-0.5">
              {toastMessage.type === 'success' ? (
                <ShieldCheck className="w-4.5 h-4.5 text-[#4ade80]" />
              ) : toastMessage.type === 'error' ? (
                <AlertCircle className="w-4.5 h-4.5 text-[#f87171]" />
              ) : (
                <Activity className="w-4.5 h-4.5 text-[#ff4500]" />
              )}
            </div>

            <div className="flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white mb-1">
                {toastMessage.type === 'success' ? 'Telemetry Success' : toastMessage.type === 'error' ? 'Security Alert' : 'System Notice'}
              </span>
              <p className="text-sm text-[#d7dadc] leading-relaxed font-semibold">
                {toastMessage.text}
              </p>
            </div>

            <button
              onClick={clearToast}
              className="p-1 border border-transparent hover:border-[#2a3c42] hover:text-white rounded-lg transition-all focus:outline-none shrink-0 cursor-pointer text-[#8797a1]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
