import React from 'react';
import { Loader2, CheckCircle2, AlertOctagon, Hourglass, HelpCircle } from 'lucide-react';

interface JobStatusBadgeProps {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timed_out' | null;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.1)]">
          <Hourglass className="w-3 h-3 animate-pulse" />
          Queued
        </span>
      );
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
          <CheckCircle2 className="w-3 h-3" />
          Generated
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse">
          <AlertOctagon className="w-3 h-3" />
          Glitch Fail
        </span>
      );
    case 'timed_out':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
          <AlertOctagon className="w-3 h-3" />
          Time Out
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 border border-gray-800 text-gray-400">
          <HelpCircle className="w-3 h-3" />
          Unknown
        </span>
      );
  }
};
