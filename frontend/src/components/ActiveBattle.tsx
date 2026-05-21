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
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=122326`;
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

  if (room.room_status === 'completed') {
    const submissions = room.active_round?.submissions || [];
    const sortedSubmissions = [...submissions].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return (b.score || 0) - (a.score || 0);
    });

    const winner = sortedSubmissions[0];

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl shadow-black/30">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#ff4500]" />

          <Trophy className="w-20 h-20 text-[#ff4500] mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-extrabold text-white tracking-wide uppercase leading-none">Battle Arena Concluded</h2>
          <p className="text-sm text-[#8797a1] mt-3.5 max-w-md mx-auto leading-relaxed font-semibold">
            The sensory campaign battle is over! All signals are processed, scores are finalized, and the champion has been declared by the director.
          </p>

          {winner ? (
            <div className="my-10 p-6 bg-[#ff4500]/5 border border-[#ff4500]/25 rounded-2xl max-w-md mx-auto relative overflow-hidden shadow-lg shadow-black/10">
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Trophy className="w-32 h-32 text-[#ff4500]" />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1a2a2d] border-2 border-[#ff4500] p-1 shadow-md shadow-black/20">
                  <img src={getAvatarUrl(winner.participant.avatar_seed)} alt="Champion" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="mt-4">
                  <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#ff4500] text-white mb-2 shadow-sm shadow-[#ff4500]/20">
                    Arena Champion 🏆
                  </span>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{winner.participant.username}</h3>
                  {winner.generated_content && (
                    <p className="text-sm text-[#ff4500] font-extrabold italic mt-2.5 px-4 leading-normal">
                      "{winner.generated_content.campaign_name}"
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm font-bold font-mono">
                    <span className="text-[#8797a1]">SCORE: <strong className="text-white">{winner.score} pts</strong></span>
                    <span className="text-[#2a3c42]">|</span>
                    <span className="text-[#8797a1]">RANK: <strong className="text-white">#{winner.rank || 1}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-10 py-6 text-center text-sm text-[#8797a1] font-semibold">
              No participant campaign submissions were compiled in this battle.
            </div>
          )}

          {sortedSubmissions.length > 1 && (
            <div className="max-w-md mx-auto mt-6 text-left space-y-3">
              <h4 className="text-xs font-bold text-[#8797a1] uppercase tracking-widest pl-1 mb-2">Final Leaderboard</h4>
              {sortedSubmissions.slice(1).map((sub, idx) => (
                <div key={sub.id} className="p-3.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-extrabold text-[#8797a1]">#{idx + 2}</span>
                    <div className="w-8 h-8 rounded bg-[#122326] overflow-hidden border border-[#2a3c42] p-0.5 shrink-0">
                      <img src={getAvatarUrl(sub.participant.avatar_seed)} alt="Contestant" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white leading-none">{sub.participant.username}</span>
                      {sub.generated_content && (
                        <span className="text-xs text-[#24a0ed] font-bold block mt-1.5">{sub.generated_content.campaign_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-[#ff4500]">
                    {sub.score} pts
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={disconnectRoom}
              className="px-8 py-3 bg-[#1a2a2d] hover:bg-[#203236] border border-[#2a3c42] text-[#d7dadc] hover:text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all focus:outline-none cursor-pointer"
            >
              Exit Lobby & Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">

      {/* HEADER SECTION (Full-width equivalent) */}
      <div className="lg:col-span-4 glass-panel px-6 py-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md shadow-black/10">
        <div className="flex items-center gap-3">
          <button
            onClick={disconnectRoom}
            className="p-2 border border-[#2a3c42] hover:border-[#ff4500]/50 hover:bg-[#1a2a2d] hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-wide leading-none">{room.room_name}</h2>
            <span className="text-xs text-[#8797a1] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-2.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#24a0ed] animate-pulse' : 'bg-red-500'}`} />
              {wsConnected ? 'Live Connection Established' : 'Offline Mode'}
              <span className="text-[#2a3c42]">|</span>
              Lobby: {room.room_id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff4500]" />
            <span className="text-xs text-[#8797a1] font-bold uppercase tracking-wider">
              Role: <strong className="text-white">{room.user_role}</strong>
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#ff4500] hover:bg-[#ff581a] text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all focus:outline-none cursor-pointer shadow-md shadow-[#ff4500]/25"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Invite Code
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR: Arena Telemetry & Status Logs */}
      <div className="lg:col-span-1 space-y-6">
        {/* Connection/Users Roster */}
        <div className="glass-panel p-5 rounded-2xl shadow-md shadow-black/10">
          <div className="flex items-center gap-2 text-[#ff4500] mb-4 border-b border-[#2a3c42] pb-3">
            <Users className="w-4.5 h-4.5 animate-pulse" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Lobby Signal Roster</h4>
          </div>

          <div className="space-y-3">
            {/* Host item */}
            <div className="p-2.5 bg-[#ff4500]/10 border border-[#ff4500]/25 rounded-xl flex items-center gap-3 shadow-md shadow-black/10">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#122326] border border-[#ff4500]/40 p-0.5 shrink-0">
                <img src={getAvatarUrl(room.host?.avatar_seed || 'host')} alt="Host" />
              </div>
              <div className="truncate flex-1">
                <span className="block text-sm font-extrabold text-white truncate leading-none">{room.host?.username}</span>
                <span className="text-[10px] text-[#ff4500] font-bold uppercase tracking-widest block mt-1.5">Arena Director</span>
              </div>
            </div>

            {/* Render other connected contestants */}
            {room.users?.filter(u => u.id !== room.host?.id).map((u) => {
              const sub = room.active_round?.submissions.find(s => s.participant.id === u.id);
              const isEliminated = sub?.status === 'eliminated';

              return (
                <div
                  key={u.id}
                  className={`p-2.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl flex items-center gap-3 justify-between ${
                    isEliminated ? 'opacity-40 border-[#ff585b]/30 bg-[#ff585b]/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 truncate flex-1">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#122326] border border-[#2a3c42] p-0.5 shrink-0 shadow-inner">
                      <img src={getAvatarUrl(u.avatar_seed)} alt="Contestant" />
                    </div>
                    <div className="truncate flex-1">
                      <span className="block text-sm font-bold text-white truncate leading-none">{u.username}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1.5 ${
                        isEliminated ? 'text-[#ff585b]' : 'text-[#ff4500]'
                      }`}>
                        {isEliminated ? 'Eliminated' : sub ? 'Active Sub' : 'Lobby Connected'}
                      </span>
                    </div>
                  </div>
                  {sub?.job && <JobStatusBadge status={sub.job.status} />}
                </div>
              );
            })}

            {(!room.users || room.users.filter(u => u.id !== room.host?.id).length === 0) && (
              <div className="py-6 text-center text-sm text-[#8797a1] font-semibold">
                No telemetry signals yet. Waiting for participants...
              </div>
            )}
          </div>
        </div>

        {/* Live Terminal Output Console */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col h-[280px] shadow-lg bg-[#122326] border border-[#2a3c42]">
          <div className="flex items-center gap-2 text-[#ff4500] mb-3 border-b border-[#2a3c42] pb-2 shrink-0">
            <Terminal className="w-4.5 h-4.5" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Event Log Console</h4>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs text-[#8797a1] space-y-2 pr-1 custom-scrollbar leading-relaxed">
            {eventFeed.map((log, i) => (
              <div key={i} className="leading-relaxed break-all">
                <span className="text-[#8797a1]/50">[{new Date().toLocaleTimeString()}]</span>{' '}
                <span className={
                  log.startsWith('[system]') ? 'text-[#24a0ed]' :
                    log.startsWith('[host]') ? 'text-[#ff4500] font-semibold' :
                      log.startsWith('[completion]') ? 'text-emerald-450 font-semibold' :
                        log.startsWith('[error]') ? 'text-[#ff585b] font-semibold' : 'text-[#d7dadc]'
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
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden shadow-md shadow-black/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#ff4500]" />

          {/* LOBBY WAITING FOR ROUND */}
          {(!room.active_round || room.active_round.status === 'completed') && (
            <div className="text-center py-8 max-w-xl mx-auto">
              <Flame className="w-12 h-12 text-[#ff4500] mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl font-extrabold text-white tracking-wide leading-none">
                {room.active_round?.status === 'completed' ? 'Round Finalized!' : 'Arena Awaiting Setup'}
              </h3>
              <p className="text-sm text-[#8797a1] mt-3.5 leading-relaxed font-semibold">
                {room.active_round?.status === 'completed'
                  ? 'All scores for the previous round are successfully saved. Host can initiate a brand new round.'
                  : 'Welcome to the creative battle lobby! The arena director is currently compiling the sensory campaign goals.'}
              </p>

              {isHost ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#ff4500]" />
                    <span className="text-xs text-[#8797a1] font-bold uppercase tracking-wider">Select Director Preset Challenge</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hostPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomTheme(preset)}
                        className="p-3.5 bg-[#1a2a2d] border border-[#2a3c42] hover:border-[#ff4500]/40 rounded-xl text-left text-sm text-[#8797a1] hover:text-white hover:bg-[#1a2a2d]/80 transition-all focus:outline-none cursor-pointer font-semibold"
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
                      className="flex-1 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#8797a1]/50 focus:outline-none focus:border-[#ff4500]/80 transition-all font-semibold"
                    />
                    <button
                      onClick={() => {
                        if (!customTheme.trim()) return;
                        startRound(customTheme);
                        setCustomTheme('');
                      }}
                      className="flex items-center gap-1.5 px-5 py-3.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-[#ff4500]/20 focus:outline-none shrink-0 cursor-pointer active:scale-[0.98]"
                    >
                      <Play className="w-4.5 h-4.5" />
                      Ignite Arena
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-2xl shadow-md">
                    <div className="w-4 h-4 border-2 border-[#ff4500] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-sm text-[#ff4500] font-bold uppercase tracking-wider animate-pulse">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a3c42] pb-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#ff4500]/10 border border-[#ff4500]/30 text-[#ff4500] mb-2.5 shadow-inner">
                    ACTIVE ROUND {room.active_round.round_number}
                  </span>
                  <h3 className="text-xl font-extrabold text-white tracking-wide leading-snug">
                    {room.active_round.prompt_theme}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-[#8797a1] font-bold uppercase tracking-wider">Lobby State:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1a2a2d] border border-[#2a3c42] text-white">
                    {room.active_round.status === 'accepting_submissions' ? 'Accepting Entries' : 'Evaluating Scores'}
                  </span>
                </div>
              </div>

              {/* HOST MONITOR CONTROLS */}
              {isHost && (
                <div className="p-4.5 bg-[#ff4500]/10 border border-[#ff4500]/25 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-left">
                    <span className="block text-sm font-bold text-white">Director Battle Control Center</span>
                    <span className="text-xs text-[#8797a1] mt-1 block font-semibold">
                      Wait for contestant prompts, watch queue telemetries, and lock entries to score.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {room.active_round.status === 'accepting_submissions' ? (
                      <button
                        onClick={lockSubmissions}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-[#ff4500]/20 focus:outline-none cursor-pointer active:scale-[0.98]"
                      >
                        <ShieldAlert className="w-4.5 h-4.5" />
                        Lock Entries & Grade
                      </button>
                    ) : (
                      <button
                        onClick={completeRound}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 focus:outline-none cursor-pointer active:scale-[0.98]"
                      >
                        <Check className="w-4.5 h-4.5" />
                        Commit Scores & Next
                      </button>
                    )}

                    <button
                      onClick={endBattle}
                      className="px-4 py-2.5 border border-[#2a3c42] hover:border-[#ff585b] text-[#8797a1] hover:text-[#ff585b] hover:bg-[#ff585b]/10 font-bold uppercase text-xs tracking-wider rounded-xl transition-all focus:outline-none cursor-pointer"
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
                            <label className="block text-xs font-bold text-[#8797a1] uppercase tracking-widest mb-2.5">
                              Your Creative Prompt Submission
                            </label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Describe your design (e.g. wet asphalt scent with neon tritium liquid, and top notes of ozone and metallic jasmine...)"
                              value={promptInput}
                              onChange={(e) => setPromptInput(e.target.value)}
                              className="w-full bg-[#1a2a2d] border border-[#2a3c42] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8797a1]/55 focus:outline-none focus:border-[#ff4500]/80 transition-all leading-relaxed font-semibold shadow-inner"
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#8797a1] font-semibold">
                              Write context-aware copy keywords to blend in our AI rendering engine.
                            </span>
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 px-6 py-3.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-[#ff4500]/25 focus:outline-none shrink-0 cursor-pointer active:scale-[0.98]"
                            >
                              <Send className="w-4 h-4" />
                              Inject Prompt
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-6 bg-[#ff4500]/10 border border-[#ff4500]/20 rounded-xl text-center space-y-3 shadow-md shadow-black/10">
                          <div className="inline-flex p-3 bg-[#ff4500]/15 border border-[#ff4500]/30 text-[#ff4500] rounded-full shadow-inner">
                            <Send className="w-6 h-6 animate-pulse" />
                          </div>
                          <h4 className="text-base font-extrabold text-white">Lobby Prompt Injected!</h4>
                          <p className="text-sm text-[#8797a1] leading-relaxed max-w-md mx-auto font-semibold">
                            Your prompt: <em className="text-[#ff4500] font-bold">"{currentParticipantSubmission?.user_prompt}"</em> is successfully submitted! Watch the AI processing status below!
                          </p>

                          <div className="pt-2 flex justify-center gap-2.5 items-center">
                            <span className="text-xs text-[#8797a1] font-bold">Active Queue Telemetry:</span>
                            <JobStatusBadge status={currentParticipantSubmission?.job?.status || 'queued'} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {room.active_round.status === 'evaluating' && (
                    <div className="p-6 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl text-center space-y-2">
                      <div className="w-4 h-4 border-2 border-[#ff4500] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-white">Director Grading Array...</h4>
                      <p className="text-xs text-[#8797a1] max-w-md mx-auto leading-relaxed font-semibold">
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
            <div className="flex items-center gap-2 text-[#ff4500] pl-1">
              <Terminal className="w-5 h-5 text-[#ff4500]" />
              <h4 className="text-base font-extrabold uppercase tracking-wider text-white">Showcase Arena Matrix</h4>
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
                        ? 'border-[#ff585b]/30 bg-[#ff585b]/5 shadow-md opacity-60'
                        : sub.rank === 1 && room.active_round?.status === 'completed'
                          ? 'border-[#ff4500]/40 shadow-[0_0_20px_rgba(255,69,0,0.08)] bg-[#ff4500]/5'
                          : 'border-[#2a3c42] hover:border-[#ff4500]/30'
                    }`}
                  >
                    {/* Elimination banner overlay */}
                    {sub.status === 'eliminated' && (
                      <div className="absolute inset-0 bg-[#ff585b]/10 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <div className="text-center p-4 bg-[#122326] border border-[#ff585b]/40 rounded-xl shadow-2xl shadow-black/40 rotate-[-8deg] max-w-[200px]">
                          <Skull className="w-8 h-8 text-[#ff585b] mx-auto mb-2 animate-bounce" />
                          <span className="block text-xs font-bold text-[#ff585b] uppercase tracking-widest">ELIMINATED</span>
                          {isHost && (
                            <button
                              onClick={() => handleEliminateToggle(sub)}
                              className="mt-3 px-3.5 py-1.5 bg-[#ff585b] hover:bg-[#ff585b]/80 text-white font-bold uppercase text-[10px] rounded-lg tracking-wider focus:outline-none cursor-pointer shadow-sm shadow-[#ff585b]/15"
                            >
                              Reinstate
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Victory Banner Overlay */}
                    {sub.rank === 1 && room.active_round?.status === 'completed' && sub.status !== 'eliminated' && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-3 py-1 bg-[#ff4500]/15 border border-[#ff4500]/30 text-[#ff4500] rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                        <Trophy className="w-3.5 h-3.5" />
                        Champion
                      </div>
                    )}

                    <div>
                      {/* Contestant details */}
                      <div className="flex items-center justify-between gap-3 border-b border-[#2a3c42] pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#122326] border border-[#2a3c42] p-0.5 shrink-0 shadow-inner">
                            <img src={getAvatarUrl(sub.participant.avatar_seed)} alt="Contestant" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-white leading-none">{sub.participant.username}</span>
                            <span className="text-[10px] text-[#8797a1] font-semibold block mt-1.5">Contestant</span>
                          </div>
                        </div>

                        {sub.job && <JobStatusBadge status={sub.job.status} />}
                      </div>

                      {/* Prompt */}
                      <div className="mb-4">
                        <span className="block text-[10px] text-[#8797a1] font-bold uppercase tracking-wider mb-1.5">RAW PROMPT INPUT</span>
                        <p className="text-sm text-[#d7dadc] bg-[#1a2a2d] p-3 rounded-xl border border-[#2a3c42] leading-normal italic font-medium shadow-inner">
                          "{sub.user_prompt}"
                        </p>
                      </div>

                      {/* JOB PENDING loaders */}
                      {sub.job && sub.job.status !== 'completed' && sub.job.status !== 'failed' && (
                        <div className="py-8 text-center space-y-3 bg-[#ff4500]/5 border border-[#ff4500]/10 rounded-xl">
                          <div className="w-6 h-6 border-2 border-[#ff4500] border-t-transparent rounded-full animate-spin mx-auto" />
                          <span className="block text-[10px] text-[#ff4500] font-bold uppercase tracking-widest animate-pulse">
                            AI QUEUE Matrix Render Active...
                          </span>
                        </div>
                      )}

                      {/* JOB FAILURE error log rendering */}
                      {sub.job && sub.job.status === 'failed' && (
                        <div className="p-4 bg-[#2d1215] border border-[#5a1c22] text-[#ff8c95] text-sm rounded-xl space-y-2 font-semibold shadow-md">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-[#ff585b]">
                            <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                            <span>AI Rendering Faulted</span>
                          </div>
                          <p className="text-[10px] text-[#ff8c95] leading-relaxed font-mono bg-[#1a2a2d] p-2.5 border border-[#2a3c42] rounded-lg">
                            {sub.job.error_message || 'Simulated engine failure. Check syntax filters.'}
                          </p>
                          <div className="pt-1 flex gap-2">
                            <button
                              onClick={() => {
                                submitPrompt(sub.user_prompt);
                                setToast("Re-queueing prompt to bypass simulated network glitches!", "info");
                              }}
                              className="px-3 py-1.5 bg-[#ff585b] hover:bg-[#ff585b]/80 text-white font-bold uppercase text-[9px] rounded-lg tracking-wider focus:outline-none cursor-pointer shadow-sm shadow-[#ff585b]/10"
                            >
                              Retry Telemetry
                            </button>
                          </div>
                        </div>
                      )}

                      {/* AI CAMPAIGN GENERATION OUTPUT PANEL */}
                      {sub.generated_content && sub.job?.status === 'completed' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl space-y-3 shadow-inner">
                            <div className="flex items-center justify-between gap-2 border-b border-[#2a3c42]/50 pb-2">
                              <span className="text-sm font-extrabold text-[#ff4500] uppercase tracking-widest truncate">
                                🚀 {sub.generated_content.campaign_name}
                              </span>
                              <span className="text-[10px] text-[#8797a1] uppercase tracking-wider font-bold">
                                LUXURY AI DIRECTORY
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] text-[#8797a1] font-bold uppercase tracking-wider mb-1">Tagline</span>
                              <p className="text-sm text-white font-extrabold italic leading-normal">
                                "{sub.generated_content.tagline}"
                              </p>
                            </div>

                            <div>
                              <span className="block text-[10px] text-[#8797a1] font-bold uppercase tracking-wider mb-1">Marketing Pitch</span>
                              <p className="text-sm text-[#d7dadc] leading-relaxed font-semibold">
                                {sub.generated_content.description}
                              </p>
                            </div>

                            <div>
                              <span className="block text-[10px] text-[#8797a1] font-bold uppercase tracking-wider mb-1">Olfactory Profile</span>
                              <p className="text-sm text-white font-mono bg-[#122326] p-2.5 border border-[#2a3c42] rounded-lg leading-relaxed">
                                {sub.generated_content.sensory_notes}
                              </p>
                            </div>
                          </div>

                          {/* Render sensory visual octagon mock */}
                          {sub.image_url && (
                            <div className="p-3 bg-[#1a2a2d] border border-[#2a3c42] rounded-xl flex flex-col gap-2 shadow-inner">
                              <span className="block text-[10px] text-[#8797a1] font-bold uppercase tracking-wider">AI Announcer Commentary</span>
                              <p className="text-xs text-[#d7dadc] leading-normal font-semibold">
                                📣 <em>"Sensory campaign '{sub.generated_content.campaign_name}' presents a highly detailed render visual describing: '{sub.image_url}'"</em>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* JUDGING SCORE PANEL */}
                    {sub.job?.status === 'completed' && (
                      <div className="border-t border-[#2a3c42] pt-4 mt-4">
                        {(room.active_round?.status === 'evaluating' || room.active_round?.status === 'completed') && (
                          <div>
                            {isHost && room.active_round?.status === 'evaluating' ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-[#8797a1] uppercase tracking-widest">
                                    Grade Score:
                                  </span>
                                  <span className="text-sm font-bold text-[#ff4500] font-mono bg-[#ff4500]/10 px-2 py-0.5 border border-[#ff4500]/20 rounded-lg">
                                    {subScore} pts
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={subScore}
                                  onChange={(e) => handleScoreChange(sub.id, parseInt(e.target.value))}
                                  className="w-full h-1.5 bg-[#1a2a2d] border border-[#2a3c42] rounded-lg appearance-none cursor-pointer accent-[#ff4500]"
                                />

                                <div className="flex gap-2 items-center">
                                  {/* Rank selectors */}
                                  <div className="flex-1 flex gap-1 bg-[#1a2a2d] border border-[#2a3c42] p-1 rounded-lg">
                                    {[1, 2, 3].map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => handleRankChange(sub.id, r)}
                                        className={`flex-1 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all focus:outline-none cursor-pointer ${
                                          subRank === r
                                            ? 'bg-[#ff4500] text-white shadow-sm shadow-[#ff4500]/20'
                                            : 'text-[#8797a1] hover:text-white'
                                        }`}
                                      >
                                        Rank {r}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    onClick={() => handlePublishScore(sub)}
                                    className="px-3.5 py-2.5 bg-[#ff4500] hover:bg-[#ff581a] text-white font-bold uppercase text-[10px] rounded-lg tracking-wider focus:outline-none shadow-md shadow-[#ff4500]/25 shrink-0 cursor-pointer active:scale-[0.98]"
                                  >
                                    Commit
                                  </button>

                                  <button
                                    onClick={() => handleEliminateToggle(sub)}
                                    title="Eliminate Contestant"
                                    className="p-2 border border-[#2a3c42] hover:border-[#ff585b] hover:bg-[#ff585b]/10 text-[#8797a1] hover:text-[#ff585b] rounded-lg transition-all focus:outline-none cursor-pointer shrink-0"
                                  >
                                    <Skull className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4.5 h-4.5 text-[#ff4500]" />
                                  <span className="text-[10px] font-bold text-[#8797a1] uppercase tracking-widest">
                                    Score Summary
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sub.rank && (
                                    <span className="px-2 py-0.5 rounded bg-[#ff4500]/10 border border-[#ff4500]/30 text-[#ff4500] text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                                      Rank #{sub.rank}
                                    </span>
                                  )}
                                  <span className="px-2.5 py-1 bg-[#1a2a2d] border border-[#2a3c42] text-white rounded-lg text-sm font-bold font-mono">
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
          <div className="glass-panel py-16 text-center shadow-lg shadow-black/10">
            <Trophy className="w-10 h-10 text-[#8797a1]/70 mx-auto mb-3" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8797a1]">Arena Campaigns Empty</h4>
            <p className="text-sm text-[#8797a1]/80 max-w-xs mx-auto leading-relaxed mt-1.5 font-semibold">
              Active campaigns from contestants will stream real-time over the network once round prompts are submitted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
