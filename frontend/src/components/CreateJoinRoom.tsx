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
    fetchUserHistory();
    const interval = setInterval(() => {
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
      connectRoom(cleanCode);
    } catch (err: any) {
      setError(err.message || 'Lobby connection aborted.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=122326`;
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
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#ff4500]" />
          
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1a2a2d] border border-[#2a3c42] p-1 mb-4 shadow-md shadow-black/20">
            <img src={getAvatarUrl(user?.avatar_seed || 'default')} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-wide leading-none">{user?.username}</h3>
          <span className="text-xs text-[#ff4500] font-bold uppercase tracking-widest mt-2.5">Arena Competitor</span>
          <p className="text-sm text-[#8797a1] mt-2.5 truncate w-full font-semibold">{user?.email}</p>

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-[#ff585b]/10 hover:bg-[#ff585b] border border-[#ff585b]/35 text-[#ff585b] hover:text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all focus:outline-none cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect Net
          </button>
        </div>

        {/* Gallery of inspiration challenges */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-[#ff4500] mb-4 border-b border-[#2a3c42] pb-3">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">Theme Generator Feed</h4>
          </div>
          <div className="space-y-3">
            {inspirationThemes.map((theme, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setRoomName(theme);
                  setToast("Theme copied to generator dashboard!", "success");
                }}
                className="p-3.5 bg-[#1a2a2d] border border-[#2a3c42] hover:border-[#ff4500]/40 rounded-xl text-left cursor-pointer transition-all hover:bg-[#203236] group"
              >
                <p className="text-sm text-[#8797a1] leading-relaxed group-hover:text-white font-semibold transition-all">
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
          <div className="p-4 bg-[#2d1215] border border-[#5a1c22] text-[#ff8c95] text-sm rounded-xl flex items-center gap-2 font-semibold">
            <Terminal className="w-4.5 h-4.5 shrink-0 text-[#ff585b]" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Lobby Card */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-[#ff4500]/30 transition-all hover:shadow-lg">
            <div>
              <div className="flex items-center gap-2 text-[#ff4500] mb-4">
                <PlusCircle className="w-5.5 h-5.5" />
                <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">Create Battle Arena</h4>
              </div>
              <p className="text-sm text-[#8797a1] mb-6 leading-relaxed font-semibold">
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
                  className="w-full bg-[#1a2a2d] border border-[#2a3c42] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8797a1]/60 focus:outline-none focus:border-[#ff4500] transition-all font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-[#ff4500]/15 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {loading ? 'Initializing net...' : 'Establish Arena'}
              </button>
            </form>
          </div>

          {/* Join Lobby Card */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-[#ff4500]/30 transition-all hover:shadow-lg">
            <div>
              <div className="flex items-center gap-2 text-[#ff4500] mb-4">
                <Link className="w-5.5 h-5.5" />
                <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">Infiltrate Lobby Code</h4>
              </div>
              <p className="text-sm text-[#8797a1] mb-6 leading-relaxed font-semibold">
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
                  className="w-full bg-[#1a2a2d] border border-[#2a3c42] rounded-xl px-4 py-3 text-sm text-white text-center font-bold tracking-widest placeholder-[#8797a1]/60 focus:outline-none focus:border-[#ff4500] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-[#ff4500]/15 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {loading ? 'Decrypting net...' : 'Connect to Code'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Arenas Quick Access Grid */}
        {(() => {
          const activeRooms = recentRooms.filter((r: any) => !r.completed);
          const completedRooms = recentRooms.filter((r: any) => r.completed);

          return (
            <div className="space-y-6">
              {/* Active Portal Access History */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-[#ff4500] border-b border-[#2a3c42] pb-3">
                  <Terminal className="w-4.5 h-4.5 animate-pulse" />
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">Active Portal Access History</h4>
                </div>
                
                <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {activeRooms.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[#8797a1] font-semibold">
                      No active portal signals detected. Create or decrypt an arena above to begin!
                    </div>
                  ) : (
                    activeRooms.map((r: any) => (
                      <div 
                        key={r.code}
                        className="p-3.5 bg-[#1a2a2d] border border-[#2a3c42] hover:border-[#ff4500]/40 rounded-xl flex items-center justify-between gap-4 transition-all group hover:bg-[#203236]"
                      >
                        <div className="truncate flex-1">
                          <span className="block text-sm font-extrabold text-white truncate leading-normal">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0b1416] text-[#8797a1] border border-[#2a3c42]">
                              Code: {r.code}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              r.role === 'host' ? 'bg-[#ff4500]/10 text-[#ff4500] border border-[#ff4500]/20' : 'bg-[#24a0ed]/10 text-[#24a0ed] border border-[#24a0ed]/20'
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
                          className="px-4 py-2 bg-[#ff4500]/15 hover:bg-[#ff4500] text-[#ff4500] hover:text-white border border-[#ff4500]/30 hover:border-transparent rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus:outline-none shrink-0 cursor-pointer"
                        >
                          Re-Connect
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Arena Triumphs */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-[#24a0ed] border-b border-[#2a3c42] pb-3">
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">Completed Arena Triumphs</h4>
                </div>
                
                <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {completedRooms.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[#8797a1] font-semibold">
                      No finalized battles archived yet. Conclude an active battle to create a monument!
                    </div>
                  ) : (
                    completedRooms.map((r: any) => (
                      <div 
                        key={r.code}
                        className="p-3.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl flex items-center justify-between gap-4 transition-all group hover:bg-[#203236]"
                      >
                        <div className="truncate flex-1">
                          <span className="block text-sm font-extrabold text-[#d7dadc] truncate leading-normal">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0b1416] text-[#8797a1] border border-[#2a3c42]">
                              Code: {r.code}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#24a0ed]/10 text-[#24a0ed] border border-[#24a0ed]/20">
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
                          className="px-4 py-2 bg-[#24a0ed]/15 hover:bg-[#24a0ed] text-[#24a0ed] hover:text-white border border-[#24a0ed]/30 hover:border-transparent rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus:outline-none shrink-0 cursor-pointer"
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


      </div>
    </div>
  );
};
