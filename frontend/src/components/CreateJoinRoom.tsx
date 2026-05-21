import React, { useState } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import { PlusCircle, Link, LogOut, Terminal, Sparkles } from 'lucide-react';

export const CreateJoinRoom: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, createRoom, connectRoom, logout, setToast } = useBattleStore();

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
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500" />
          
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-purple-500/30 p-1 mb-4 shadow-lg shadow-purple-500/10">
            <img src={getAvatarUrl(user?.avatar_seed || 'default')} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <h3 className="text-lg font-bold text-white tracking-wide">{user?.username}</h3>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Arena Competitor</span>
          <p className="text-xs text-gray-500 mt-2 truncate w-full">{user?.email}</p>

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-2 px-4 py-2 border border-gray-800 hover:border-red-500/30 text-gray-400 hover:text-red-400 text-xs font-semibold rounded-xl uppercase tracking-wider transition-all focus:outline-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect Net
          </button>
        </div>

        {/* Gallery of inspiration challenges */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800">
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
                className="p-3 bg-slate-950/40 border border-gray-900 hover:border-purple-500/20 rounded-xl text-left cursor-pointer transition-all hover:bg-slate-950/70 group"
              >
                <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-200">
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
          {/* Create Lobbby Card */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-4">
                <PlusCircle className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Create Battle Arena</h4>
              </div>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
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
                  className="w-full bg-slate-950/70 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/80 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)] disabled:opacity-50"
              >
                {loading ? 'Initializing net...' : 'Establish Arena'}
              </button>
            </form>
          </div>

          {/* Join Lobby Card */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-4">
                <Link className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Infiltrate Lobby Code</h4>
              </div>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Connect directly into an active server. Submit creative text prompts, trigger background AI workers, and dominate the ranks.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Enter 5-Letter Code (e.g. YL4AV)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950/70 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white text-center font-bold tracking-widest placeholder-gray-600 focus:outline-none focus:border-cyan-500/80 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] disabled:opacity-50"
              >
                {loading ? 'Decrypting net...' : 'Connect to Code'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
