import React, { useState, useEffect, useRef } from 'react';
import { useBattleStore, type Submission } from '../store/useBattleStore';
import { JobStatusBadge } from './JobStatusBadge';
import { 
  Users, Trophy, Skull, Play, ShieldAlert, Check, 
  Send, Copy, ArrowLeft, Terminal, AlertTriangle, Flame, Sparkles, Award
} from 'lucide-react';

export const ActiveBattle: React.FC = () => {
  const { 
    room, wsConnected, disconnectRoom, setToast,
    startRound, submitPrompt, lockSubmissions, scoreSubmission, completeRound, endBattle
  } = useBattleStore();

  const [customTheme, setCustomTheme] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [eventFeed, setEventFeed] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Copy invitation link helper
  const handleCopyCode = () => {
    if (!room.room_id) return;
    navigator.clipboard.writeText(room.room_id);
    setToast(`Room code ${room.room_id} copied to clipboard!`, 'success');
  };

  // Setup client side live terminal activity feed logs derived from store mutations
  useEffect(() => {
    if (!room.room_id) return;
    setEventFeed((prev) => [...prev, `[system] Synchronized with lobby ${room.room_id}.`]);
  }, [room.room_id]);

  useEffect(() => {
    if (room.active_round) {
      setEventFeed((prev) => [
        ...prev, 
        `[arena] Round ${room.active_round?.round_number} active. Theme: "${room.active_round?.prompt_theme}"`
      ]);
    }
  }, [room.active_round?.id]);

  useEffect(() => {
    if (!room.active_round?.submissions) return;
    
    // Log job telemetries
    room.active_round.submissions.forEach((sub) => {
      if (sub.job?.status === 'running') {
        setEventFeed((prev) => {
          const log = `[telemetry] Job rendering campaign for contestant ${sub.participant.username}...`;
          return prev.includes(log) ? prev : [...prev, log];
        });
      } else if (sub.job?.status === 'completed') {
        setEventFeed((prev) => {
          const log = `[completion] Campaign successfully generated for ${sub.participant.username}!`;
          return prev.includes(log) ? prev : [...prev, log];
        });
      } else if (sub.job?.status === 'failed') {
        setEventFeed((prev) => {
          const log = `[error] AI engine faulted for ${sub.participant.username}: ${sub.job?.error_message}`;
          return prev.includes(log) ? prev : [...prev, log];
        });
      }
    });
  }, [room.active_round?.submissions]);

  // Scroll event console to bottom
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventFeed]);

  if (!room.room_id) return null;

  const isHost = room.user_role === 'host';
  const hasSubmitted = room.active_round?.submissions.some(
    (sub) => sub.participant.id === useBattleStore.getState().user?.id
  );

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0f172a`;
  };

  const handleScoreChange = (submissionId: string, val: number) => {
    setScores((prev) => ({ ...prev, [submissionId]: val }));
  };

  const handleRankChange = (submissionId: string, val: number) => {
    setRanks((prev) => ({ ...prev, [submissionId]: val }));
  };

  const handlePublishScore = (sub: Submission) => {
    const scoreVal = scores[sub.id] ?? sub.score ?? 50;
    const rankVal = ranks[sub.id] ?? sub.rank ?? null;
    scoreSubmission(sub.id, scoreVal, rankVal, sub.status);
    setToast(`Published score of ${scoreVal} to ${sub.participant.username}'s prompt!`, 'success');
    setEventFeed((prev) => [...prev, `[host] Ranked ${sub.participant.username} with ${scoreVal} points.`]);
  };

  const handleEliminateToggle = (sub: Submission) => {
    const nextStatus = sub.status === 'eliminated' ? 'active' : 'eliminated';
    const scoreVal = sub.score ?? 0;
    const rankVal = sub.rank ?? null;
    scoreSubmission(sub.id, scoreVal, rankVal, nextStatus);
    
    const alertMsg = nextStatus === 'eliminated' 
      ? `Eliminated contestant ${sub.participant.username} from the arena!`
      : `Reinstated contestant ${sub.participant.username} back into the arena.`;
      
    setToast(alertMsg, nextStatus === 'eliminated' ? 'error' : 'success');
    setEventFeed((prev) => [...prev, `[host] Contestant ${sub.participant.username} is ${nextStatus.toUpperCase()}!`]);
  };

  const currentParticipantSubmission = room.active_round?.submissions.find(
    (sub) => sub.participant.id === useBattleStore.getState().user?.id
  );

  // Preset perfume themes for hosts
  const hostPresets = [
    "Most insane luxury cyberpunk perfume campaign for Gen-Z.",
    "Bioluminescent deep-sea sensory mist tailored for digital explorers.",
    "Olfactory digital virus: liquid gasoline and burnt memory chips.",
    "Anti-gravity cosmetic campaign combining chrome and synthetic lavender."
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
      
      {/* HEADER SECTION (Full-width equivalent) */}
      <div className="lg:col-span-4 glass-panel px-6 py-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={disconnectRoom}
            className="p-2 border border-gray-800 hover:border-gray-700 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">{room.room_name}</h2>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
              {wsConnected ? 'Live Connection Established' : 'Offline Mode'}
              <span className="text-gray-700">|</span>
              Lobby: {room.room_id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-900 border border-gray-800 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Role: <strong className="text-white">{room.user_role}</strong>
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/70 border border-gray-800 hover:border-cyan-500/30 text-gray-400 hover:text-cyan-400 text-xs font-semibold rounded-xl uppercase tracking-wider transition-all focus:outline-none"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Invite Code
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR: Arena Telemetry & Status Logs */}
      <div className="lg:col-span-1 space-y-6">
        {/* Connection/Users Roster */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center gap-2 text-cyan-400 mb-4 border-b border-gray-800/50 pb-3">
            <Users className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Lobby Signal Roster</h4>
          </div>
          
          <div className="space-y-3">
            {/* Host item */}
            <div className="p-2.5 bg-purple-500/5 border border-purple-500/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-purple-500/30">
                <img src={getAvatarUrl(room.host?.avatar_seed || 'host')} alt="Host" />
              </div>
              <div className="truncate flex-1">
                <span className="block text-xs font-bold text-white truncate">{room.host?.username}</span>
                <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Arena Director</span>
              </div>
            </div>

            {/* Render other contestants as they submit */}
            {room.active_round?.submissions.map((sub) => (
              <div 
                key={sub.id}
                className={`p-2.5 bg-slate-950/40 border border-gray-900 rounded-xl flex items-center gap-3 justify-between ${
                  sub.status === 'eliminated' ? 'opacity-40 border-red-950' : ''
                }`}
              >
                <div className="flex items-center gap-3 truncate flex-1">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-gray-800">
                    <img src={getAvatarUrl(sub.participant.avatar_seed)} alt="Contestant" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-white truncate">{sub.participant.username}</span>
                    <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-widest">
                      {sub.status === 'eliminated' ? 'Eliminated' : 'Active Sub'}
                    </span>
                  </div>
                </div>
                {sub.job && <JobStatusBadge status={sub.job.status} />}
              </div>
            ))}
            
            {room.active_round?.submissions.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-600">
                No telemetry signals yet. Waiting for participants...
              </div>
            )}
          </div>
        </div>

        {/* Live Terminal Output Console */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col h-[280px]">
          <div className="flex items-center gap-2 text-purple-400 mb-3 border-b border-gray-800/50 pb-2 shrink-0">
            <Terminal className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Event Log Console</h4>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-gray-400 space-y-2 pr-1">
            {eventFeed.map((log, i) => (
              <div key={i} className="leading-normal break-all">
                <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>{' '}
                <span className={
                  log.startsWith('[system]') ? 'text-cyan-400' :
                  log.startsWith('[host]') ? 'text-purple-400' :
                  log.startsWith('[completion]') ? 'text-emerald-400' :
                  log.startsWith('[error]') ? 'text-red-400' : 'text-gray-400'
                }>{log}</span>
              </div>
            ))}
            <div ref={consoleBottomRef} />
          </div>
        </div>
      </div>

      {/* MIDDLE CONTAINER: Core Battle Controls & Active Submission Arena */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Core Arena Lobbies Controls */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500" />
          
          {/* LOBBY WAITING FOR ROUND */}
          {(!room.active_round || room.active_round.status === 'completed') && (
            <div className="text-center py-8 max-w-xl mx-auto">
              <Flame className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-white tracking-wide">
                {room.active_round?.status === 'completed' ? 'Round Finalized!' : 'Arena Awaiting Setup'}
              </h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {room.active_round?.status === 'completed' 
                  ? 'All scores for the previous round are committed in SQLite. Host can initiate a brand new round.'
                  : 'Welcome to the creative battle lobby! The arena director is currently compiling the sensory campaign goals.'}
              </p>

              {isHost ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select Director Preset Challenge</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hostPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomTheme(preset)}
                        className="p-3 bg-slate-950/40 border border-gray-800 hover:border-purple-500/40 rounded-xl text-left text-xs text-gray-400 hover:text-gray-200 transition-all focus:outline-none"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Or craft your custom campaign theme..."
                      value={customTheme}
                      onChange={(e) => setCustomTheme(e.target.value)}
                      className="flex-1 bg-slate-950/70 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/80 transition-all"
                    />
                    <button
                      onClick={() => {
                        if (!customTheme.trim()) return;
                        startRound(customTheme);
                        setCustomTheme('');
                      }}
                      className="flex items-center gap-1.5 px-5 py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)] focus:outline-none shrink-0"
                    >
                      <Play className="w-4 h-4" />
                      Ignite Arena
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-3 px-5 py-3 bg-slate-950/60 border border-gray-900 rounded-2xl">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider animate-pulse">
                      Awaiting Director Launchpad Signals...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE ROUND INTERFACES */}
          {room.active_round && room.active_round.status !== 'completed' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/50 pb-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 mb-2">
                    ACTIVE ROUND {room.active_round.round_number}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-wide leading-snug">
                    {room.active_round.prompt_theme}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lobby State:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 border border-gray-800 text-white">
                    {room.active_round.status === 'accepting_submissions' ? 'Accepting Entries' : 'Evaluating Scores'}
                  </span>
                </div>
              </div>

              {/* HOST MONITOR CONTROLS */}
              {isHost && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-left">
                    <span className="block text-xs font-bold text-white">Director Battle Control Center</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Wait for contestant prompts, watch queue telemetries, and lock entries to score.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {room.active_round.status === 'accepting_submissions' ? (
                      <button
                        onClick={lockSubmissions}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)] focus:outline-none"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Lock Entries & Grade
                      </button>
                    ) : (
                      <button
                        onClick={completeRound}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] focus:outline-none"
                      >
                        <Check className="w-4 h-4" />
                        Commit Scores & Next
                      </button>
                    )}

                    <button
                      onClick={endBattle}
                      className="px-4 py-2.5 border border-gray-800 hover:border-red-500/40 text-gray-400 hover:text-red-400 font-bold uppercase text-xs tracking-wider rounded-xl transition-all focus:outline-none"
                    >
                      End Battle
                    </button>
                  </div>
                </div>
              )}

              {/* PARTICIPANT ENTRY INTERFACE */}
              {!isHost && (
                <div>
                  {room.active_round.status === 'accepting_submissions' && (
                    <div>
                      {!hasSubmitted ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!promptInput.trim()) return;
                            submitPrompt(promptInput);
                            setPromptInput('');
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                              Your Creative Prompt Submission
                            </label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Describe your design (e.g. wet asphalt scent with neon tritium liquid, and top notes of ozone and metallic jasmine...)"
                              value={promptInput}
                              onChange={(e) => setPromptInput(e.target.value)}
                              className="w-full bg-slate-950/70 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/80 transition-all leading-relaxed"
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">
                              Write context-aware copy keywords to blend in our AI rendering engine.
                            </span>
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] focus:outline-none shrink-0"
                            >
                              <Send className="w-4 h-4" />
                              Inject Prompt
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-6 bg-slate-950/40 border border-gray-900 rounded-xl text-center space-y-3">
                          <div className="inline-flex p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full">
                            <Send className="w-6 h-6 animate-pulse" />
                          </div>
                          <h4 className="text-sm font-bold text-white">Lobby Prompt Injected!</h4>
                          <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                            Your prompt: <em className="text-gray-300">"{currentParticipantSubmission?.user_prompt}"</em> is safely written to SQLite. Watch the AI queue matrix below!
                          </p>

                          <div className="pt-2 flex justify-center gap-2">
                            <span className="text-xs text-gray-400 font-semibold">Active Queue Telemetry:</span>
                            <JobStatusBadge status={currentParticipantSubmission?.job?.status || 'queued'} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {room.active_round.status === 'evaluating' && (
                    <div className="p-6 bg-slate-950/40 border border-gray-900 rounded-xl text-center space-y-2">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-white">Director Grading Array...</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                        Submissions are locked. The arena host is currently scoring and ranking the active campaign generations. Watch live dashboard updates below!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACTIVE SHOWCASE GRID */}
        {room.active_round && room.active_round.submissions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-cyan-400">
              <Terminal className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">Showcase Arena Matrix</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {room.active_round.submissions.map((sub) => {
                const subScore = scores[sub.id] ?? sub.score ?? 50;
                const subRank = ranks[sub.id] ?? sub.rank ?? 1;
                
                return (
                  <div 
                    key={sub.id} 
                    className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                      sub.status === 'eliminated' 
                        ? 'border-red-500/20 bg-red-950/5 shadow-2xl opacity-60' 
                        : sub.rank === 1 && room.active_round?.status === 'completed'
                          ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.08)] bg-yellow-500/5'
                          : 'border-gray-800/80 hover:border-gray-800'
                    }`}
                  >
                    {/* Elimination banner overlay */}
                    {sub.status === 'eliminated' && (
                      <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <div className="text-center p-4 bg-slate-950 border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/10 rotate-[-8deg] max-w-[200px]">
                          <Skull className="w-8 h-8 text-red-500 mx-auto mb-2 animate-bounce" />
                          <span className="block text-[10px] font-bold text-red-500 uppercase tracking-widest">ELIMINATED</span>
                          {isHost && (
                            <button
                              onClick={() => handleEliminateToggle(sub)}
                              className="mt-3 px-3 py-1 bg-red-500 text-slate-950 font-bold uppercase text-[9px] rounded-lg tracking-wider focus:outline-none"
                            >
                              Reinstate
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Victory Banner Overlay */}
                    {sub.rank === 1 && room.active_round?.status === 'completed' && sub.status !== 'eliminated' && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                        <Trophy className="w-3.5 h-3.5" />
                        Champion
                      </div>
                    )}

                    <div>
                      {/* Contestant details */}
                      <div className="flex items-center justify-between gap-3 border-b border-gray-800/50 pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-gray-800 shrink-0">
                            <img src={getAvatarUrl(sub.participant.avatar_seed)} alt="Contestant" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-white leading-normal">{sub.participant.username}</span>
                            <span className="text-[9px] text-gray-500">Contestant</span>
                          </div>
                        </div>

                        {sub.job && <JobStatusBadge status={sub.job.status} />}
                      </div>

                      {/* Prompt */}
                      <div className="mb-4">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">RAW PROMPT INPUT</span>
                        <p className="text-xs text-gray-400 bg-slate-950/50 p-2.5 rounded-xl border border-gray-900 leading-normal italic">
                          "{sub.user_prompt}"
                        </p>
                      </div>

                      {/* JOB PENDING loaders */}
                      {sub.job && sub.job.status !== 'completed' && sub.job.status !== 'failed' && (
                        <div className="py-8 text-center space-y-3 bg-slate-950/20 border border-gray-900/50 rounded-xl">
                          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-widest animate-pulse">
                            AI QUEUE Matrix Render Active...
                          </span>
                        </div>
                      )}

                      {/* JOB FAILURE error log rendering */}
                      {sub.job && sub.job.status === 'failed' && (
                        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl space-y-2">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <span>AI Rendering Faulted</span>
                          </div>
                          <p className="text-[10px] text-red-300 leading-relaxed font-mono">
                            {sub.job.error_message || 'Simulated engine failure. Check syntax filters.'}
                          </p>
                          <div className="pt-1 flex gap-2">
                            <button
                              onClick={() => {
                                // Simple interactive retry handler
                                submitPrompt(sub.user_prompt);
                                setToast("Re-queueing prompt to bypass simulated network glitches!", "info");
                              }}
                              className="px-2.5 py-1 bg-red-500 text-slate-950 font-bold uppercase text-[9px] rounded-lg tracking-wider focus:outline-none"
                            >
                              Retry Telemetry
                            </button>
                          </div>
                        </div>
                      )}

                      {/* AI CAMPAIGN GENERATION OUTPUT PANEL */}
                      {sub.generated_content && sub.job?.status === 'completed' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-950/70 border border-gray-900 rounded-xl space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-gray-800/40 pb-2">
                              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest truncate">
                                🚀 {sub.generated_content.campaign_name}
                              </span>
                              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                                LUXURY AI DIRECTORY
                              </span>
                            </div>

                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Tagline</span>
                              <p className="text-xs text-gray-200 font-bold italic leading-normal">
                                "{sub.generated_content.tagline}"
                              </p>
                            </div>

                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Marketing Pitch</span>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {sub.generated_content.description}
                              </p>
                            </div>

                            <div>
                              <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Olfactory Profile</span>
                              <p className="text-[10px] text-cyan-300/80 leading-normal font-mono bg-cyan-950/20 p-2 border border-cyan-500/10 rounded-lg">
                                {sub.generated_content.sensory_notes}
                              </p>
                            </div>
                          </div>

                          {/* Render sensory visual octagon mock */}
                          {sub.image_url && (
                            <div className="p-3 bg-slate-950/30 border border-gray-900 rounded-xl flex flex-col gap-2">
                              <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">AI Announcer Commentary</span>
                              <p className="text-[10px] text-gray-400 leading-normal">
                                📣 <em className="text-gray-300">"Sensory campaign '{sub.generated_content.campaign_name}' presents a highly detailed render visual describing: '{sub.image_url}'"</em>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* JUDGING SCORE PANEL */}
                    {sub.job?.status === 'completed' && (
                      <div className="border-t border-gray-800/50 pt-4 mt-4">
                        {/* Display existing scores if round complete or active evaluation */}
                        {(room.active_round?.status === 'evaluating' || room.active_round?.status === 'completed') && (
                          <div>
                            {isHost && room.active_round?.status === 'evaluating' ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Grade Score:
                                  </span>
                                  <span className="text-sm font-bold text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 rounded-lg">
                                    {subScore} pts
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={subScore}
                                  onChange={(e) => handleScoreChange(sub.id, parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />

                                <div className="flex gap-2 items-center">
                                  {/* Rank selectors */}
                                  <div className="flex-1 flex gap-1 bg-slate-950 border border-gray-900 p-1 rounded-lg">
                                    {[1, 2, 3].map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => handleRankChange(sub.id, r)}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                                          subRank === r 
                                            ? 'bg-purple-500 text-slate-950 shadow-[0_0_8px_rgba(168,85,247,0.3)]' 
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                      >
                                        Rank {r}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    onClick={() => handlePublishScore(sub)}
                                    className="px-3 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold uppercase text-[10px] rounded-lg tracking-wider focus:outline-none shadow-lg shadow-purple-500/10 shrink-0"
                                  >
                                    Commit
                                  </button>

                                  <button
                                    onClick={() => handleEliminateToggle(sub)}
                                    title="Eliminate Contestant"
                                    className="p-2 border border-gray-900 hover:border-red-500/30 text-gray-500 hover:text-red-400 rounded-lg transition-all focus:outline-none"
                                  >
                                    <Skull className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-purple-400" />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Score Summary
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sub.rank && (
                                    <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                                      Rank #{sub.rank}
                                    </span>
                                  )}
                                  <span className="px-2.5 py-1 bg-slate-900 border border-gray-800 text-white rounded-lg text-xs font-bold font-mono">
                                    {sub.score !== null ? `${sub.score} pts` : 'Pending Grade'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* EMPTY STATE SHOWCASE */}
        {(!room.active_round || room.active_round.submissions.length === 0) && (
          <div className="glass-panel py-16 text-center rounded-2xl border border-gray-800">
            <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Arena Campaigns Empty</h4>
            <p className="text-[11px] text-gray-600 max-w-xs mx-auto leading-relaxed mt-1">
              Active campaigns from contestants will stream real-time over the network once round prompts are submitted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
