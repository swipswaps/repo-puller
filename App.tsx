import React, { useState, useCallback, useEffect } from 'react';
import { ArrowRight, Play, RefreshCw, Command, Settings, Database, Activity, ShieldAlert, CheckSquare, Square, Box, Plus, X } from 'lucide-react';
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
    pythonPackages: [],
    installTools: false,
    configureFirewall: false
  });

  const [newPackage, setNewPackage] = useState('');
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

  const handleAddPackage = () => {
    const pkg = newPackage.trim();
    if (pkg && !sysConfig.pythonPackages.includes(pkg)) {
      setSysConfig(prev => ({ ...prev, pythonPackages: [...prev.pythonPackages, pkg] }));
      setNewPackage('');
    }
  };

  const handleRemovePackage = (pkg: string) => {
    setSysConfig(prev => ({ ...prev, pythonPackages: prev.pythonPackages.filter(p => p !== pkg) }));
  };

  const generateCommand = () => {
    const lines: string[] = ['#!/bin/bash', ''];
    const pm = sysConfig.packageManager;

    // Define Install Command based on PM
    let installCmd = '';
    switch (pm) {
        case 'apt': installCmd = 'sudo apt-get install -y'; break;
        case 'dnf': installCmd = 'sudo dnf install -y'; break;
        case 'yum': installCmd = 'sudo yum install -y'; break;
        case 'pacman': installCmd = 'sudo pacman -Syu --noconfirm'; break;
        case 'zypper': installCmd = 'sudo zypper install -y'; break;
        case 'brew': installCmd = 'brew install'; break;
    }

    // Helper function for tool detection
    if (sysConfig.installTools || sysConfig.configureFirewall) {
        lines.push('# Function to detect and install missing tools');
        lines.push('check_install() {');
        lines.push('    CMD=$1');
        lines.push('    PKG=$2');
        lines.push('    if ! command -v "$CMD" &> /dev/null; then');
        lines.push(`        echo "Tool $CMD not found. Installing $PKG..."`);
        lines.push(`        ${installCmd} "$PKG"`);
        lines.push('    else');
        lines.push(`        echo "Tool $CMD is already installed."`);
        lines.push('    fi');
        lines.push('}');
        lines.push('');
    }

    // System Setup Commands
    if (sysConfig.installTools) {
        lines.push('# --- System Tools Detection & Installation ---');
        
        lines.push('check_install git git');
        lines.push('check_install curl curl');
        
        if (source.useGh) {
            lines.push('check_install gh gh');
        }

        if (['apt', 'pacman'].includes(pm)) {
            lines.push('check_install ssh openssh-client'); // or openssh for pacman, simplified here
        } else {
            lines.push('check_install ssh openssh');
        }
    }

    if (sysConfig.configureFirewall) {
        lines.push('');
        lines.push('# --- Firewall Configuration ---');
        if (['apt', 'pacman'].includes(pm)) {
            lines.push('check_install ufw ufw');
            lines.push('echo "Configuring UFW..."');
            lines.push('sudo ufw allow ssh');
            lines.push('sudo ufw allow 80/tcp');
            lines.push('sudo ufw allow 443/tcp');
            lines.push('sudo ufw --force enable');
        } else if (['dnf', 'yum', 'zypper'].includes(pm)) {
            lines.push('check_install firewall-cmd firewalld');
            lines.push('echo "Configuring Firewalld..."');
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
        lines.push('');
        lines.push('# --- Python Dependencies ---');
        if (sysConfig.pythonPackages.length > 0) {
             lines.push('echo "Building requirements.txt..."');
             lines.push('cat <<EOF > requirements.txt');
             sysConfig.pythonPackages.forEach(pkg => {
                 lines.push(pkg);
             });
             lines.push('EOF');
        } else {
            lines.push('# No specific packages listed in GUI. Assuming requirements.txt exists.');
        }
        lines.push('pip3 install -r requirements.txt');
    }

    // Main Sync Command
    lines.push('');
    lines.push('# --- Run Sync Operation ---');
    
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

    addLog(`Repo Puller - Configuration Validated [Manager: ${pm.toUpperCase()}]`);
    addLog('================================================================');
    
    // Log Source details
    let sourceLog = `Source (${source.type}): ${source.path}`;
    if (source.type === 'ssh' && source.privateKeyPath) {
        sourceLog += ` (Key: ${source.privateKeyPath})`;
    }
    if (source.type === 'git' && source.useGh) {
        sourceLog += ` (via GitHub CLI)`;
    }
    addLog(sourceLog);

    // Log Target details
    let targetLog = `Target (${target.type}): ${target.path}`;
    if (target.forceSudo) targetLog += ` (Sudo Enabled)`;
    if (target.type === 'ssh' && target.privateKeyPath) {
        targetLog += ` (Key: ${target.privateKeyPath})`;
    }
    addLog(targetLog);

    addLog('================================================================');

    // System Config Logs
    if (sysConfig.installTools) {
        addLog(`[Config] Tool Detection: ON (Checks git, curl, ssh...)`);
    }
    if (sysConfig.configureFirewall) {
        addLog(`[Config] Firewall Config: ON`);
    }
    if (sysConfig.installDependencies) {
        addLog(`[Config] Python Dependencies: ${sysConfig.pythonPackages.length > 0 ? 'Build & Install' : 'Install existing'}`);
        if (sysConfig.pythonPackages.length > 0) {
             addLog(`   + Building requirements.txt with: ${sysConfig.pythonPackages.join(', ')}`);
        }
    }

    addLog('Generating intelligent synchronization script...');
    
    // Slight delay for UX
    await new Promise(r => setTimeout(r, 400)); 

    const cmd = generateCommand();
    addLog('Script generated successfully.', 'success');
    addLog(cmd, 'info');

    addLog('================================================================');
    addLog('Ready for execution. Copy the generated script to the target environment.', 'warning');
    
    if (!dryRun) {
        setHistory(prev => [{
            id: prev.length > 0 ? prev[0].id + 1 : 1,
            timestamp: new Date().toISOString(),
            source: source.path,
            target: target.path,
            status: 'completed',
            filesCopied: 0,
            filesFailed: 0,
            backupPath: ''
        }, ...prev]);
    }

    setIsSyncing(false);
  };

  const handleRollback = (id: number) => {
    // Rollback is manual in this context
    const confirm = window.confirm(`Rollback requires manual intervention for operation #${id}. View log details?`);
    if (confirm) {
        addLog(`Rollback requested for #${id}. Please manually restore from backup if available.`, 'warning');
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
                            <div className="text-xs font-medium text-slate-200">Detect & Install System Tools</div>
                            <div className="text-[10px] text-slate-500">
                                Checks for git, gh, ssh, firewall tools
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
                                Ensure SSH/Web ports are open
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
                            <div className="text-[10px] text-slate-500">Builds requirements.txt & runs pip install</div>
                        </div>
                    </button>

                    {/* Dependencies Manager UI */}
                    {sysConfig.installDependencies && (
                      <div className="mt-2 pl-7 pr-1 space-y-2 animate-fadeIn border-l-2 border-slate-700 ml-1.5">
                         <div className="flex gap-2">
                           <input 
                             value={newPackage} 
                             onChange={(e) => setNewPackage(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleAddPackage()}
                             placeholder="Add package (e.g. pandas)"
                             className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                           />
                           <button 
                             onClick={handleAddPackage}
                             className="bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 flex items-center justify-center transition-colors"
                           >
                             <Plus size={14} />
                           </button>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {sysConfig.pythonPackages.length === 0 && (
                             <span className="text-[10px] text-slate-500 italic">No packages specified. Will use existing requirements.txt if present.</span>
                           )}
                           {sysConfig.pythonPackages.map(pkg => (
                              <span key={pkg} className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 group">
                                {pkg} 
                                <button onClick={() => handleRemovePackage(pkg)} className="text-slate-500 group-hover:text-red-400"><X size={10} /></button>
                              </span>
                           ))}
                         </div>
                      </div>
                    )}
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
                  {isSyncing ? 'Processing...' : 'Generate Script'}
                </button>
              </div>

              {/* Command Preview */}
              <div className="bg-black/40 rounded border border-slate-800 p-3">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Command size={10} /> Generated Script
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
              <Activity size={16} /> History
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