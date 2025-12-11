import React, { useEffect, useRef } from 'react';
import { SyncLog } from '../types';

interface TerminalProps {
  logs?: SyncLog[];
}

const Terminal: React.FC<TerminalProps> = ({ logs = [] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full shadow-inner">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">sync_output.log</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm terminal-scroll"
      >
        {!logs || logs.length === 0 ? (
          <div className="text-slate-600 italic">Ready to sync...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1 leading-relaxed">
              <span className="text-slate-500 mr-2">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
              <span className={`
                ${log.level === 'info' ? 'text-slate-300' : ''}
                ${log.level === 'success' ? 'text-emerald-400 font-medium' : ''}
                ${log.level === 'warning' ? 'text-yellow-400' : ''}
                ${log.level === 'error' ? 'text-red-400 font-bold' : ''}
              `}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;