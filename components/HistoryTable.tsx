import React from 'react';
import { RotateCcw, CheckCircle, XCircle, Clock, Save } from 'lucide-react';
import { SyncOperation } from '../types';

interface HistoryTableProps {
  history: SyncOperation[];
  onRollback: (id: number) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ history, onRollback }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Timestamp</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Changes</th>
            <th className="px-4 py-3 font-medium">Backup</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {history.length === 0 ? (
             <tr>
               <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                 No sync operations recorded in database.
               </td>
             </tr>
          ) : (
            history.map((op) => (
              <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-500 font-mono">#{op.id}</td>
                <td className="px-4 py-3 text-slate-300">
                  {new Date(op.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border
                    ${op.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                    ${op.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                    ${op.status === 'rolled_back' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : ''}
                    ${op.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                  `}>
                    {op.status === 'completed' && <CheckCircle size={10} />}
                    {op.status === 'failed' && <XCircle size={10} />}
                    {op.status === 'rolled_back' && <RotateCcw size={10} />}
                    {op.status === 'in_progress' && <Clock size={10} />}
                    {op.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <span className="text-emerald-400">+{op.filesCopied}</span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-red-400">!{op.filesFailed}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-[150px]" title={op.backupPath}>
                  {op.backupPath ? (
                    <span className="flex items-center gap-1">
                      <Save size={10} />
                      {op.backupPath.split('/').pop()}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {op.status === 'completed' && op.backupPath && (
                    <button
                      onClick={() => onRollback(op.id)}
                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 px-2 py-1 rounded transition-colors text-xs font-medium inline-flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Rollback
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;