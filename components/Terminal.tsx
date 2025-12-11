import React, { useEffect, useRef } from 'react';
import { SyncLog } from '../types';
import { TerminalSquare, Play, Settings, Download } from 'lucide-react';

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
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full shadow-inner relative">
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
        className="flex-1 p-4 overflow-y-auto font-mono text-sm terminal-scroll relative"
      >
        {!logs || logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center opacity-60 pointer-events-none">
            <TerminalSquare size={48} className="mb-4 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-500 mb-2">Ready to Configure</h3>
            <p className="text-xs max-w-xs leading-relaxed mb-6">
              Configure your source and target repositories on the left, then click Generate Script to see the output here.
            </p>
            <div className="flex gap-6 text-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-slate-800">
                  <Settings size={14} />
                </div>
                <span>Configure</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-slate-800">
                  <Play size={14} />
                </div>
                <span>Generate</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-slate-800">
                  <Download size={14} />
                </div>
                <span>Download</span>
              </div>
            </div>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1 leading-relaxed break-all">
              <span className="text-slate-500 mr-2 select-none">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
              {log.level === 'diff' ? (
                 <span className="font-mono text-xs opacity-90 block pl-4 border-l-2 border-slate-800 my-0.5">
                   {log.message.startsWith('+') && <span className="text-green-400 bg-green-900/10 px-1 inline-block w-full">{log.message}</span>}
                   {log.message.startsWith('-') && <span className="text-red-400 bg-red-900/10 px-1 inline-block w-full">{log.message}</span>}
                   {log.message.startsWith('@') && <span className="text-blue-400">{log.message}</span>}
                   {!['+', '-', '@'].some(c => log.message.startsWith(c)) && <span className="text-slate-500">{log.message}</span>}
                 </span>
              ) : (
                <span className={`
                  ${log.level === 'info' ? 'text-slate-300' : ''}
                  ${log.level === 'success' ? 'text-emerald-400 font-medium' : ''}
                  ${log.level === 'warning' ? 'text-yellow-400' : ''}
                  ${log.level === 'error' ? 'text-red-400 font-bold' : ''}
                `}>
                  {log.message}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;