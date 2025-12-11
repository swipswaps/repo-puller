import React, { useState, useCallback, useEffect } from 'react';
import { ArrowRight, Play, RefreshCw, Command, Settings, Database, Activity, ShieldAlert, CheckSquare, Square, Box } from 'lucide-react';
import PathSelector from './components/PathSelector';
import Terminal from './components/Terminal';
import HistoryTable from './components/HistoryTable';
import { RepoConfig, SyncLog, SyncOperation, SystemConfig, PackageManager } from './types';

const App: React.FC = () => {
  // State for the Repo Puller configuration
  const [source, setSource] = useState<RepoConfig>({ type: 'local', path: '' });
  const [target, setTarget] = useState<RepoConfig>({ type: 'local', path: '' });
  
  // System Configuration State
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    packageManager: 'apt',
    installDependencies: false,
    installTools: false,
    configureFirewall: false
  });

  const [dryRun, setDryRun] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'history'>('console');

  // Simulation State
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  
  // Auto-detect sudo requirement for target
  useEffect(() => {
    if (target.type === 'local' && target.path.startsWith('/') && 
        !target.path.startsWith('/home') && !target.path.startsWith('/Users') && !target.path.startsWith('/tmp')) {
      setTarget(prev => ({ ...prev, forceSudo: true }));
    }
  }, [target.path, target.type]);

  // Auto-check install tools if gh is selected but likely missing
  useEffect(() => {
    if (source.useGh && !sysConfig.installTools) {
       // Optional: could hint user here, but we'll let them decide
    }
  }, [source.useGh]);
  
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
    const lines: string[] = [];
    const pm = sysConfig.packageManager;

    // System Setup Commands
    if (sysConfig.installTools) {
        lines.push(`# Install System Tools using ${pm}`);
        
        // Define packages based on distro
        let tools = ['git', 'curl'];
        
        // Add GH CLI if needed (assuming repo exists or basic package)
        tools.push('gh');

        if (pm === 'apt') tools.push('openssh-client', 'ufw');
        else if (pm === 'dnf' || pm === 'yum') tools.push('openssh-clients', 'firewalld');
        else if (pm === 'pacman') tools.push('openssh', 'ufw');
        else if (pm === 'zypper') tools.push('openssh', 'firewalld');
        else if (pm === 'brew') tools.push('openssh');

        // Generate Install Command
        switch (pm) {
            case 'apt':
                lines.push('sudo apt-get update');
                lines.push(`sudo apt-get install -y ${tools.join(' ')}`);
                break;
            case 'dnf':
                lines.push(`sudo dnf install -y ${tools.join(' ')}`);
                break;
            case 'yum':
                lines.push(`sudo yum install -y ${tools.join(' ')}`);
                break;
            case 'pacman':
                lines.push(`sudo pacman -Syu --noconfirm ${tools.join(' ')}`);
                break;
            case 'zypper':
                lines.push(`sudo zypper install -y ${tools.join(' ')}`);
                break;
            case 'brew':
                lines.push(`brew install ${tools.join(' ')}`);
                break;
        }
    }

    if (sysConfig.configureFirewall) {
        lines.push('# Configure Firewall');
        
        // UFW (Debian/Ubuntu/Arch)
        if (['apt', 'pacman'].includes(pm)) {
            lines.push('sudo ufw allow ssh');
            lines.push('sudo ufw allow 80/tcp');
            lines.push('sudo ufw allow 443/tcp');
            lines.push('sudo ufw --force enable');
        } 
        // Firewalld (Fedora/RHEL/Suse)
        else if (['dnf', 'yum', 'zypper'].includes(pm)) {
            lines.push('sudo systemctl enable --now firewalld');
            lines.push('sudo firewall-cmd --permanent --add-service=ssh');
            lines.push('sudo firewall-cmd --permanent --add-service=http');
            lines.push('sudo firewall-cmd --permanent --add-service=https');
            lines.push('sudo firewall-cmd --reload');
        } else {
            lines.push('# Manual firewall configuration required for this OS/Environment');
        }
    }

    if (sysConfig.installDependencies) {
        lines.push('# Install Python Dependencies');
        lines.push('pip3 install -r requirements.txt');
    }

    // Main Sync Command
    if (lines.length > 0) lines.push('\n# Run Sync');
    
    let cmd = '';
    if (target.forceSudo) {
      cmd += 'sudo ';
    }
    
    cmd += 'python3 sync.py';
    
    // Source construction
    let sourceStr = source.path;
    if (source.type === 'ssh') {
        sourceStr = `ssh://${source.user || 'user'}@${source.host || 'host'}:${source.path}`;
        if (source.privateKeyPath) {
            sourceStr += `?identity_file=${source.privateKeyPath}`;
        }
    }
    
    // Target construction
    let targetStr = target.path;
    if (target.type === 'ssh') {
        targetStr = `ssh://${target.user || 'user'}@${target.host || 'host'}:${target.path}`;
        if (target.privateKeyPath) {
            targetStr += `?identity_file=${target.privateKeyPath}`;
        }
    }

    cmd += ` --source "${sourceStr}"`;
    cmd += ` --target "${targetStr}"`;
    
    if (source.type === 'git' && source.useGh) {
      cmd += ' --use-gh';
    }
    
    if (dryRun) cmd += ' --dry-run';
    
    lines.push(cmd);
    
    return lines.join('\n');
  };

  const runSync = async () => {
    if (!source.path || !target.path) {
      addLog('Error: Source and Target paths are required.', 'error');
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    setActiveTab('console');
    const pm = sysConfig.packageManager;

    addLog(`Repo Puller - Operation Started [Manager: ${pm.toUpperCase()}]`);
    
    // Simulation: Installation
    if (sysConfig.installTools) {
        if (pm === 'apt') addLog('Updating package lists (sudo apt-get update)...');
        
        let toolNameList = 'git, gh, curl';
        if (['dnf', 'yum', 'zypper'].includes(pm)) toolNameList += ', openssh-clients, firewalld';
        else toolNameList += ', openssh-client, ufw';
        
        addLog(`Installing tools via ${pm}: ${toolNameList}...`, 'warning');
        await new Promise(r => setTimeout(r, 1500));
        addLog('✅ System tools installed.', 'success');
    }

    // Simulation: Firewall
    if (sysConfig.configureFirewall) {
        if (['dnf', 'yum', 'zypper'].includes(pm)) {
            addLog('Configuring firewall (firewall-cmd)...', 'warning');
            await new Promise(r => setTimeout(r, 600));
            addLog('✅ Firewall rules updated (ssh, http, https).', 'success');
        } else if (['apt', 'pacman'].includes(pm)) {
            addLog('Configuring firewall (ufw)...', 'warning');
            await new Promise(r => setTimeout(r, 600));
            addLog('✅ Firewall rules updated (Allow SSH, 80, 443).', 'success');
        } else {
             addLog('⚠️ Skipping firewall config (Not supported for selected OS).', 'warning');
        }
    }

    // Simulation: Dependencies
    if (sysConfig.installDependencies) {
        addLog('Installing python requirements...', 'info');
        await new Promise(r => setTimeout(r, 800));
        addLog('✅ Dependencies installed.', 'success');
    }

    // Simulation: Sync
    addLog('================================================================');
    
    let sourceLog = `Source (${source.type}): ${source.path}`;
    if (source.type === 'ssh' && source.privateKeyPath) {
        sourceLog += ` (Key: ${source.privateKeyPath})`;
    }
    addLog(sourceLog);

    if (target.forceSudo) addLog('Elevating privileges for target write access...', 'warning');
    
    let targetLog = `Target (${target.type}): ${target.path}`;
    if (target.type === 'ssh' && target.privateKeyPath) {
        targetLog += ` (Key: ${target.privateKeyPath})`;
    }
    addLog(targetLog);

    addLog('================================================================');
    
    await new Promise(r => setTimeout(r, 800));

    if (source.type === 'git') {
      if (source.useGh) {
          addLog('Authenticating via GitHub CLI...', 'info');
          await new Promise(r => setTimeout(r, 500));
      }
      addLog(`Cloning repository from ${source.path}...`);
      await new Promise(r => setTimeout(r, 1200));
      
      // Handle subdirectories in git
      if (source.path.includes('tree') || source.path.split('/').length > 5) {
        const repoParts = source.path.split('github.com/')[1]?.split('/');
        if (repoParts && repoParts.length >= 2) {
             addLog(`Detected sparse checkout requirement for '${repoParts.slice(2).join('/')}'`, 'info');
        }
      }
    }
    
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

  const toggleSysConfig = (key: keyof SystemConfig) => {
    setSysConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSysConfig(prev => ({ ...prev, packageManager: e.target.value as PackageManager }));
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
                isTarget={true}
              />

              {/* System Configuration Panel */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                        <ShieldAlert size={14} className="text-orange-400" />
                        <span>System Setup</span>
                    </div>
                    
                    {/* Package Manager Selector */}
                    <div className="flex items-center gap-2">
                        <Box size={14} className="text-slate-500" />
                        <select 
                            value={sysConfig.packageManager}
                            onChange={handlePmChange}
                            className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        >
                            <option value="apt">APT (Debian/Ubuntu)</option>
                            <option value="dnf">DNF (Fedora/RHEL)</option>
                            <option value="yum">YUM (CentOS/RHEL)</option>
                            <option value="pacman">Pacman (Arch)</option>
                            <option value="zypper">Zypper (OpenSUSE)</option>
                            <option value="brew">Homebrew (macOS)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <button 
                        onClick={() => toggleSysConfig('installTools')}
                        className="flex items-center gap-3 w-full p-2 rounded hover:bg-slate-800 transition-colors text-left"
                    >
                        {sysConfig.installTools ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-slate-500" />}
                        <div>
                            <div className="text-xs font-medium text-slate-200">Install System Tools</div>
                            <div className="text-[10px] text-slate-500">
                                {sysConfig.packageManager === 'apt' ? 'git, gh, openssh-client, ufw' : 
                                 sysConfig.packageManager === 'dnf' ? 'git, gh, openssh-clients, firewalld' : 
                                 'git, gh, ssh tools, firewall tools'}
                            </div>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => toggleSysConfig('configureFirewall')}
                        className="flex items-center gap-3 w-full p-2 rounded hover:bg-slate-800 transition-colors text-left"
                    >
                        {sysConfig.configureFirewall ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-slate-500" />}
                        <div>
                            <div className="text-xs font-medium text-slate-200">Configure Firewall</div>
                            <div className="text-[10px] text-slate-500">
                                {['apt', 'pacman'].includes(sysConfig.packageManager) ? 'Allow ports via ufw' : 
                                 ['dnf', 'yum', 'zypper'].includes(sysConfig.packageManager) ? 'Allow services via firewalld' : 'Manual configuration'}
                            </div>
                        </div>
                    </button>

                     <button 
                        onClick={() => toggleSysConfig('installDependencies')}
                        className="flex items-center gap-3 w-full p-2 rounded hover:bg-slate-800 transition-colors text-left"
                    >
                        {sysConfig.installDependencies ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-slate-500" />}
                        <div>
                            <div className="text-xs font-medium text-slate-200">Install Dependencies</div>
                            <div className="text-[10px] text-slate-500">pip install -r requirements.txt</div>
                        </div>
                    </button>
                </div>
              </div>

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
                <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-40 overflow-y-auto">
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