import React, { useState, useEffect } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { PlusCircle, Link, LogOut, Terminal, Sparkles } from 'lucide-react';

export const CreateJoinRoom: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, createRoom, connectRoom, logout, setToast, publicRooms, fetchPublicRooms, recentRooms, fetchUserHistory } = useBattleStore();

  useEffect(() => {
    fetchPublicRooms();
    fetchUserHistory();
    const interval = setInterval(() => {
      fetchPublicRooms();
      fetchUserHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const code = await createRoom(roomName);
      if (code) {
        connectRoom(code);
      } else {
        setError('Lobby creation rejected by security protocols.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;
    
    if (cleanCode.length !== 5) {
      setError('Lobby codes must be precisely 5 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Connect to the room. The WS handler will close the channel and broadcast an error if the room is invalid
      connectRoom(cleanCode);
    } catch (err: any) {
      setError(err.message || 'Lobby connection aborted.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0f172a`;
  };

  const inspirationThemes = [
    "Most insane luxury cyberpunk perfume campaign for Gen-Z.",
    "Retro-futuristic zero-gravity sneakers engineered for orbit.",
    "Synthesized digital-static energy drink that alters color-perception.",
    "Holographic streetwear campaign tailored for virtual netrunners.",
    "Bio-luminescent cybernetic neural-link extensions for digital pets."
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
      
      {/* Col 1: Profile Display & Lobby Action Logs */}
      <div className="md:col-span-1 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500" />
          
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-purple-500/30 p-1 mb-4 shadow-lg shadow-purple-500/10">
            <img src={getAvatarUrl(user?.avatar_seed || 'default')} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <h3 className="text-lg font-bold text-white tracking-wide">{user?.username}</h3>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Arena Competitor</span>
          <p className="text-xs text-slate-400 mt-2 truncate w-full">{user?.email}</p>

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-950/25 border border-slate-850 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-semibold rounded-xl uppercase tracking-wider transition-all focus:outline-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect Net
          </button>
        </div>

        {/* Gallery of inspiration challenges */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            <Sparkles className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Theme Generator Feed</h4>
          </div>
          <div className="space-y-3">
            {inspirationThemes.map((theme, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setRoomName(theme);
                  setToast("Theme copied to generator dashboard!", "success");
                }}
                className="p-3 bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 rounded-xl text-left cursor-pointer transition-all hover:bg-slate-950/80 group"
              >
                <p className="text-xs text-slate-300 leading-relaxed group-hover:text-white">
                  {theme}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Col 2-3: Creation and Joining Boards */}
      <div className="md:col-span-2 space-y-6">
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
            <Terminal className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Lobby Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-purple-500/20 transition-all">
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-4">
                <PlusCircle className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Create Battle Arena</h4>
              </div>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Form a stateful creative lobby, claim your Host privilege, customize the round guidelines, and score participants.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Insane Cyberpunk Campaigns"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/80 transition-all font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)] disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {loading ? 'Initializing net...' : 'Establish Arena'}
              </button>
            </form>
          </div>

          {/* Join Lobby Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/20 transition-all">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-4">
                <Link className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Infiltrate Lobby Code</h4>
              </div>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Connect directly into an active server. Submit creative text prompts, trigger background AI workers, and dominate the ranks.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Enter 5-Letter Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white text-center font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-cyan-500/80 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {loading ? 'Decrypting net...' : 'Connect to Code'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Arenas Quick Access Grid (Fast Portal Access) */}
        {(() => {
          const activeRooms = recentRooms.filter((r: any) => !r.completed);
          const completedRooms = recentRooms.filter((r: any) => r.completed);

          return (
            <div className="space-y-6">
              {/* Active Portal Access History */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg shadow-black/25">
                <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2">
                  <Terminal className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white">Active Portal Access History</h4>
                </div>
                
                <div className="max-h-[220px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {activeRooms.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 font-medium">
                      No active portal signals detected. Create or decrypt an arena above to begin!
                    </div>
                  ) : (
                    activeRooms.map((r: any) => (
                      <div 
                        key={r.code}
                        className="p-3 bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 rounded-xl flex items-center justify-between gap-4 transition-all group hover:bg-slate-950/90"
                      >
                        <div className="truncate flex-1">
                          <span className="block text-xs font-bold text-white truncate leading-normal">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-800">
                              Code: {r.code}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              r.role === 'host' ? 'bg-purple-950/50 text-purple-400 border border-purple-500/10' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/10'
                            }`}>
                              {r.role === 'host' ? 'Director' : 'Contestant'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            connectRoom(r.code);
                            setToast(`Connecting back to Arena lobby: ${r.code}...`, 'success');
                          }}
                          disabled={loading}
                          className="px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-slate-950 border border-purple-500/30 hover:border-transparent rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none shrink-0 cursor-pointer"
                        >
                          Re-Connect
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Arena Triumphs */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg shadow-black/25">
                <div className="flex items-center gap-2 text-yellow-400 border-b border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4 text-yellow-450 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white">Completed Arena Triumphs</h4>
                </div>
                
                <div className="max-h-[220px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {completedRooms.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 font-medium">
                      No finalized battles archived yet. Conclude an active battle to create a monument!
                    </div>
                  ) : (
                    completedRooms.map((r: any) => (
                      <div 
                        key={r.code}
                        className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4 transition-all group hover:bg-slate-950/70"
                      >
                        <div className="truncate flex-1">
                          <span className="block text-xs font-semibold text-slate-300 truncate leading-normal">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800">
                              Code: {r.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-yellow-950/20 text-yellow-500/80 border border-yellow-500/10">
                              Concluded
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            connectRoom(r.code);
                            setToast(`Retrieving Concluded Arena Podium: ${r.code}...`, 'success');
                          }}
                          disabled={loading}
                          className="px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-slate-950 border border-yellow-500/30 hover:border-transparent rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none shrink-0 cursor-pointer"
                        >
                          View Podium
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Public Active Arenas Listing */}
        {publicRooms && publicRooms.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg shadow-black/25">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Live Public Battle Arenas</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publicRooms.map((r: any) => (
                <div 
                  key={r.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 rounded-xl flex items-center justify-between gap-4 transition-all group hover:bg-slate-950/85"
                >
                  <div className="truncate flex-1">
                    <span className="block text-xs font-bold text-white truncate leading-normal">
                      {r.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-800">
                        Code: {r.id}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-950/50 text-purple-400 border border-purple-500/10">
                        Host: {r.host?.username || 'Director'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      connectRoom(r.id);
                      setToast(`Infiltrating Arena lobby: ${r.id}...`, 'success');
                    }}
                    disabled={loading}
                    className="px-3.5 py-2 bg-cyan-400/10 hover:bg-cyan-400 text-cyan-400 hover:text-slate-950 border border-cyan-400/30 hover:border-transparent rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none shrink-0 cursor-pointer"
                  >
                    Join Arena
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
