import React, { useState, useCallback } from 'react';
import { ArrowRight, Play, RefreshCw, Command, Settings, Database, Activity } from 'lucide-react';
import PathSelector from './components/PathSelector';
import Terminal from './components/Terminal';
import HistoryTable from './components/HistoryTable';
import { RepoConfig, SyncLog, SyncOperation } from './types';

const App: React.FC = () => {
  // State for the Repo Puller configuration
  const [source, setSource] = useState<RepoConfig>({ type: 'local', path: '' });
  const [target, setTarget] = useState<RepoConfig>({ type: 'local', path: '' });
  const [dryRun, setDryRun] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'history'>('console');

  // Simulation State
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  
  // Dummy History Data
  const [history, setHistory] = useState<SyncOperation[]>([
    {
      id: 1024,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      source: '~/Documents/receipts-ocr',
      target: '~/Documents/paddle-ocr',
      status: 'completed',
      filesCopied: 9,
      filesFailed: 0,
      backupPath: '/home/owner/Documents/paddle-ocr_backup_20251211_094753'
    }
  ]);

  const addLog = useCallback((message: string, level: SyncLog['level'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message
    }]);
  }, []);

  const generateCommand = () => {
    let cmd = 'python3 sync.py';
    
    // Logic to construct source argument based on type
    const sourceStr = source.type === 'ssh' 
      ? `ssh://${source.user || 'user'}@${source.host || 'host'}:${source.path}`
      : source.path;
      
    // Logic to construct target argument based on type
    const targetStr = target.type === 'ssh' 
      ? `ssh://${target.user || 'user'}@${target.host || 'host'}:${target.path}`
      : target.path;

    cmd += ` --source "${sourceStr}"`;
    cmd += ` --target "${targetStr}"`;
    
    if (dryRun) cmd += ' --dry-run';
    
    return cmd;
  };

  const runSync = async () => {
    if (!source.path || !target.path) {
      addLog('Error: Source and Target paths are required.', 'error');
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    setActiveTab('console');

    // Simulate the python script execution logic
    addLog('Repo Puller - Sync Operation Initiated');
    addLog('================================================================');
    addLog(`Source (${source.type}): ${source.path}`);
    addLog(`Target (${target.type}): ${target.path}`);
    addLog(`Dry Run: ${dryRun}`);
    addLog('================================================================');
    
    await new Promise(r => setTimeout(r, 800));
    
    if (!dryRun) {
        const backupName = `${target.path.split('/').pop()}_backup_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)}`;
        addLog(`Creating backup at: ${target.path}/../${backupName}...`, 'warning');
        addLog('Backup successful. Size: 45MB', 'success');
    }

    await new Promise(r => setTimeout(r, 600));
    addLog('Analyzing files to sync...');
    
    await new Promise(r => setTimeout(r, 1000));
    addLog('Found 4 files to sync');

    const files = [
        'src/components/Scanner.tsx',
        'src/utils/helpers.ts',
        'README.md',
        'package.json'
    ];

    for (const file of files) {
        await new Promise(r => setTimeout(r, 400));
        if (dryRun) {
            addLog(`Would copy: ${file}`, 'info');
        } else {
            addLog(`✅ Copied: ${file}`, 'success');
        }
    }

    await new Promise(r => setTimeout(r, 500));
    addLog('================================================================');
    addLog(`Sync Summary: Files copied: ${dryRun ? 0 : 4}, Failed: 0`);
    
    if (!dryRun) {
        setHistory(prev => [{
            id: prev.length > 0 ? prev[0].id + 1 : 1,
            timestamp: new Date().toISOString(),
            source: source.path,
            target: target.path,
            status: 'completed',
            filesCopied: 4,
            filesFailed: 0,
            backupPath: `${target.path}_backup`
        }, ...prev]);
    }

    setIsSyncing(false);
  };

  const handleRollback = (id: number) => {
    const confirm = window.confirm(`Are you sure you want to rollback operation #${id}? This will overwrite the current target.`);
    if (confirm) {
        setHistory(prev => prev.map(op => 
            op.id === id ? { ...op, status: 'rolled_back' } : op
        ));
        addLog(`Rollback for operation #${id} completed successfully.`, 'warning');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <RefreshCw className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Repo Puller GUI</h1>
            <p className="text-xs text-slate-400">Secure Synchronization Tool</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 flex items-center gap-2">
            <Database size={14} className="text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">repo_puller.db</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800/30 backdrop-blur rounded-xl border border-slate-700/50 p-1">
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2 mb-4">
              <Settings size={18} className="text-blue-400" />
              <h2 className="font-semibold text-slate-200">Configuration</h2>
            </div>
            
            <div className="px-4 pb-4 space-y-6">
              {/* Source Path Selector with Logic for Local/SSH/Git */}
              <PathSelector 
                label="Source Repository" 
                config={source} 
                onChange={setSource} 
              />

              <div className="flex justify-center text-slate-600">
                <ArrowRight size={20} className="transform rotate-90 lg:rotate-0" />
              </div>

              {/* Target Path Selector with Logic for Local/SSH/Git */}
              <PathSelector 
                label="Target Repository" 
                config={target} 
                onChange={setTarget} 
              />

              <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 font-medium">Dry Run Mode</span>
                  <button 
                    onClick={() => setDryRun(!dryRun)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dryRun ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${dryRun ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Simulate the sync process without modifying any files on disk.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={runSync}
                  disabled={isSyncing}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
                    ${isSyncing 
                      ? 'bg-slate-700 cursor-not-allowed opacity-75' 
                      : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 active:transform active:scale-[0.98]'
                    }`}
                >
                  {isSyncing ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Start Synchronization'}
                </button>
              </div>

              {/* Command Preview */}
              <div className="bg-black/40 rounded border border-slate-800 p-3">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Command size={10} /> Generated Command
                </div>
                <code className="text-xs font-mono text-emerald-400 break-all block">
                  {generateCommand()}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output & History */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-8rem)] lg:h-auto">
          <div className="flex items-center gap-1 mb-0 bg-slate-800/50 p-1 rounded-t-xl border-t border-x border-slate-700 w-fit">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'console' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal size={16} /> Console Output
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'history' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity size={16} /> History & Rollback
            </button>
          </div>

          <div className="flex-1 bg-slate-800/30 backdrop-blur rounded-b-xl rounded-tr-xl border border-slate-700/50 p-4 min-h-[500px]">
            {activeTab === 'console' ? (
              <Terminal logs={logs} />
            ) : (
              <div className="h-full bg-slate-950 border border-slate-800 rounded-lg shadow-inner">
                <HistoryTable history={history} onRollback={handleRollback} />
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;