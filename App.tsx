import React, { useState, useCallback, useEffect } from 'react';
import { 
  ArrowRight, Play, RefreshCw, Command, Settings, Database, Activity, 
  ShieldAlert, CheckSquare, Square, Box, Plus, X, ChevronRight, ChevronLeft, 
  Check, FileCode, Copy, Download, ArrowUpDown
} from 'lucide-react';
import PathSelector from './components/PathSelector';
import Terminal from './components/Terminal';
import HistoryTable from './components/HistoryTable';
import { RepoConfig, SyncLog, SyncOperation, SystemConfig, PackageManager } from './types';

const App: React.FC = () => {
  // State for the Repo Puller configuration
  const [source, setSource] = useState<RepoConfig>({ type: 'local', path: '' });
  const [target, setTarget] = useState<RepoConfig>({ type: 'local', path: '' });
  const [errors, setErrors] = useState<{source?: boolean; target?: boolean}>({});
  
  // System Configuration State
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    packageManager: 'apt',
    installDependencies: false,
    pythonPackages: [],
    installTools: false,
    configureFirewall: false
  });

  // Track if user has manually selected a package manager
  const [pmManuallySet, setPmManuallySet] = useState(false);

  const [newPackage, setNewPackage] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'history'>('console');

  // Simulation State
  const [isSyncing, setIsSyncing] = useState(false); // Used for "Processing..." state
  const [logs, setLogs] = useState<SyncLog[]>([]);
  
  // Wizard State
  const [wizardStep, setWizardStep] = useState<number>(-1); // -1 = closed
  
  const addLog = useCallback((message: string, level: SyncLog['level'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message
    }]);
  }, []);

  // Auto-detect sudo requirement for target
  useEffect(() => {
    if (target.type === 'local' && target.path.startsWith('/') && 
        !target.path.startsWith('/home') && !target.path.startsWith('/Users') && !target.path.startsWith('/tmp')) {
      setTarget(prev => ({ ...prev, forceSudo: true }));
    }
  }, [target.path, target.type]);

  // Auto-detect package manager based on Browser Environment
  useEffect(() => {
    if (pmManuallySet) return;

    const ua = navigator.userAgent.toLowerCase();
    let detected: PackageManager | null = null;

    if (ua.includes('macintosh') || ua.includes('mac os x')) {
      detected = 'brew';
    } else if (ua.includes('fedora')) {
      detected = 'dnf';
    } else if (ua.includes('centos') || ua.includes('rhel')) {
      detected = 'yum';
    } else if (ua.includes('arch')) {
      detected = 'pacman';
    } else if (ua.includes('suse')) {
      detected = 'zypper';
    }

    if (detected) {
      setSysConfig(prev => {
        if (prev.packageManager !== detected) {
          addLog(`System detected: switching package manager to ${detected}`, 'info');
          return { ...prev, packageManager: detected! };
        }
        return prev;
      });
    }
  }, [pmManuallySet, addLog]);

  // Auto-check install tools if gh is selected but likely missing
  useEffect(() => {
    if (source.useGh && !sysConfig.installTools) {
       // Optional: could hint user here, but we'll let them decide
    }
  }, [source.useGh, sysConfig.installTools]);
  
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

  const handleSwap = () => {
    setSource(target);
    setTarget(source);
    setErrors({});
    addLog('Swapped Source and Target configurations.', 'info');
  };

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

  // --- Script Generation Logic Split ---

  const getInstallCmd = (pm: PackageManager) => {
    switch (pm) {
        case 'apt': return 'sudo apt-get install -y';
        case 'dnf': return 'sudo dnf install -y';
        case 'yum': return 'sudo yum install -y';
        case 'pacman': return 'sudo pacman -Syu --noconfirm';
        case 'zypper': return 'sudo zypper install -y';
        case 'brew': return 'brew install';
    }
  };

  const generateCheckToolFunction = () => {
      const pm = sysConfig.packageManager;
      const installCmd = getInstallCmd(pm);
      
      // We return the raw string content for the bash function
      return `# Function to detect, install and verify tool versions
check_tool() {
    CMD=$1
    PKG=$2
    MIN_VER=$3

    if ! command -v "$CMD" &> /dev/null; then
        echo "Tool $CMD not found. Installing $PKG..."
        ${installCmd} "$PKG"
    else
        echo "Tool $CMD is already installed."
        if [ ! -z "$MIN_VER" ]; then
            CURRENT_VER=""
            if [ "$CMD" = "git" ]; then
                CURRENT_VER=$(git --version | awk '{print $3}')
            elif [ "$CMD" = "ssh" ]; then
                CURRENT_VER=$(ssh -V 2>&1 | awk '{print $1}' | cut -d_ -f2 | sed 's/[^0-9.]//g')
            elif [ "$CMD" = "gh" ]; then
                # gh version 2.40.0 (2023-11-14) -> 2.40.0
                CURRENT_VER=$(gh --version | awk '{print $3}')
            fi

            if [ ! -z "$CURRENT_VER" ]; then
                # Check if CURRENT_VER >= MIN_VER using sort -V
                if [ "$(printf '%s\\n%s' "$MIN_VER" "$CURRENT_VER" | sort -V | head -n1)" != "$MIN_VER" ]; then
                    echo "⚠️  $CMD version $CURRENT_VER is older than required $MIN_VER. Attempting upgrade..."
                    ${installCmd} "$PKG"
                else
                    echo "✅ $CMD version $CURRENT_VER meets requirement >= $MIN_VER"
                fi
            fi
        fi
    fi
}`;
  };

  const generateToolChecks = () => {
    if (!sysConfig.installTools) return '# Tools installation skipped by user configuration.';
    
    const lines = ['# --- System Tools Detection & Installation ---'];
    const pm = sysConfig.packageManager;

    lines.push('check_tool git git 2.25.0');
    lines.push('check_tool curl curl');
    lines.push('check_tool python3 python3'); // Required for sync.py

    if (source.type === 'git' && source.useGh) {
        lines.push('check_tool gh gh 2.0.0');
    }

    if (sysConfig.installDependencies) {
        // python3-pip is common for debian/fedora. 
        // Arch uses python-pip, Brew includes it with python.
        const pipPkg = pm === 'pacman' ? 'python-pip' : 'python3-pip';
        lines.push(`check_tool pip3 ${pipPkg}`);
    }

    if (['apt', 'pacman'].includes(pm)) {
        lines.push('check_tool ssh openssh-client 7.6'); 
    } else {
        lines.push('check_tool ssh openssh 7.6');
    }
    return lines.join('\n');
  };

  const generateFirewallConfig = () => {
    if (!sysConfig.configureFirewall) return '# Firewall configuration skipped.';

    const lines = ['# --- Firewall Configuration ---'];
    const pm = sysConfig.packageManager;

    if (['apt', 'pacman'].includes(pm)) {
        lines.push('check_tool ufw ufw');
        lines.push('echo "Configuring UFW..."');
        lines.push('sudo ufw allow ssh');
        lines.push('sudo ufw allow 80/tcp');
        lines.push('sudo ufw allow 443/tcp');
        lines.push('sudo ufw --force enable');
    } else if (['dnf', 'yum', 'zypper'].includes(pm)) {
        lines.push('check_tool firewall-cmd firewalld');
        lines.push('echo "Configuring Firewalld..."');
        lines.push('sudo systemctl enable --now firewalld');
        lines.push('sudo firewall-cmd --permanent --add-service=ssh');
        lines.push('sudo firewall-cmd --permanent --add-service=http');
        lines.push('sudo firewall-cmd --permanent --add-service=https');
        lines.push('sudo firewall-cmd --reload');
    } else {
        lines.push('# Manual firewall configuration required for this OS/Environment');
    }
    return lines.join('\n');
  };

  const generateDependencies = () => {
    if (!sysConfig.installDependencies) return '# Dependency installation skipped.';

    const lines = ['# --- Python Dependencies ---'];
    if (sysConfig.pythonPackages.length > 0) {
         lines.push('echo "Building requirements.txt..."');
         lines.push('cat <<EOF > requirements.txt');
         sysConfig.pythonPackages.forEach(pkg => lines.push(pkg));
         lines.push('EOF');
    } else {
        lines.push('# No specific packages listed. Assuming requirements.txt exists.');
    }
    lines.push('pip3 install -r requirements.txt');
    return lines.join('\n');
  };

  const generateSyncCommand = () => {
    const lines = ['# --- Run Sync Operation ---'];
    let cmd = '';
    if (target.forceSudo) cmd += 'sudo ';
    
    cmd += 'python3 sync.py';
    
    let sourceStr = source.path;
    if (source.type === 'ssh') {
        sourceStr = `ssh://${source.user || 'user'}@${source.host || 'host'}:${source.path}`;
        if (source.privateKeyPath) sourceStr += `?identity_file=${source.privateKeyPath}`;
    }
    
    let targetStr = target.path;
    if (target.type === 'ssh') {
        targetStr = `ssh://${target.user || 'user'}@${target.host || 'host'}:${target.path}`;
        if (target.privateKeyPath) targetStr += `?identity_file=${target.privateKeyPath}`;
    }

    cmd += ` --source "${sourceStr}"`;
    cmd += ` --target "${targetStr}"`;
    
    if (source.type === 'git' && source.useGh) cmd += ' --use-gh';
    if (source.type === 'git' && source.branch) cmd += ` --branch "${source.branch}"`;
    if (dryRun) cmd += ' --dry-run';
    
    lines.push(cmd);
    return lines.join('\n');
  };

  const generateFullScript = () => {
    const parts = ['#!/bin/bash', ''];
    if (sysConfig.installTools || sysConfig.configureFirewall) {
        parts.push(generateCheckToolFunction());
        parts.push('');
    }
    parts.push(generateToolChecks());
    parts.push('');
    parts.push(generateFirewallConfig());
    parts.push('');
    parts.push(generateDependencies());
    parts.push('');
    parts.push(generateSyncCommand());
    
    return parts.filter(p => p !== '').join('\n');
  };

  const runLinter = () => {
      addLog('Running static analysis...', 'info');
      const script = generateFullScript();
      
      const lines = script.split('\n');
      let issuesFound = false;

      lines.forEach((line, idx) => {
          const l = line.trim();
          const lineNum = idx + 1;
          
          if (!l || l.startsWith('#')) return;

          // Check for spaces around assignment (SC1068)
          if (/^[a-zA-Z_][a-zA-Z0-9_]*\s+=\s+/.test(l) || /^[a-zA-Z_][a-zA-Z0-9_]*\s+=/.test(l) || /^[a-zA-Z_][a-zA-Z0-9_]*=\s+/.test(l)) {
              if (!l.includes('[') && !l.includes('if')) {
                   addLog(`[SC1068] Line ${lineNum}: Spaces around assignment detected.`, 'error');
                   issuesFound = true;
              }
          }

          // Check for unquoted variables in echo/printf/commands (SC2086) - Heuristic
          if (l.includes('$') && !l.includes('"') && !l.includes("'")) {
              if (!l.includes('=') && !l.startsWith('if') && !l.startsWith('while') && !l.startsWith('check_tool')) {
                  addLog(`[SC2086] Line ${lineNum}: Double quote variables to prevent globbing/word splitting.`, 'warning');
              }
          }

          // Check for if [ condition] (SC1035)
          if (l.includes('if [') && !l.includes('if [ ')) {
              addLog(`[SC1035] Line ${lineNum}: Missing space after '['.`, 'error');
              issuesFound = true;
          }
           if (l.includes(' ]') === false && l.endsWith(']')) {
               if (l.includes('[ ') && !l.endsWith(' ]') && l.endsWith(']')) {
                   addLog(`[SC1035] Line ${lineNum}: Missing space before ']'.`, 'error');
                   issuesFound = true;
               }
          }
      });

      if (!issuesFound) {
          addLog('Script passed syntax checks.', 'success');
      }
  };

  const toggleSysConfig = (key: keyof SystemConfig) => {
    setSysConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSysConfig(prev => ({ ...prev, packageManager: e.target.value as PackageManager }));
    setPmManuallySet(true);
  };

  const validateRepoConfig = (config: RepoConfig, label: string): string[] => {
    const errors: string[] = [];
    
    // Basic Path check
    if (!config.path || config.path.trim() === '') {
        errors.push(`${label}: Path is required.`);
        return errors;
    }

    // Local Validation
    if (config.type === 'local') {
        if (!config.path.startsWith('/')) {
            errors.push(`${label}: Local path must be absolute (start with '/').`);
        }
    }

    // SSH Validation
    if (config.type === 'ssh') {
        if (!config.host || config.host.trim() === '') {
            errors.push(`${label}: SSH Host is required.`);
        }
        if (!config.user || config.user.trim() === '') {
            errors.push(`${label}: SSH User is required.`);
        }
        if (!config.path.startsWith('/')) {
            errors.push(`${label}: Remote path must be absolute (start with '/').`);
        }
    }

    // Git Validation
    if (config.type === 'git') {
        const gitProtocols = ['https://', 'http://', 'git@', 'ssh://', 'git://'];
        const hasValidProtocol = gitProtocols.some(protocol => config.path.startsWith(protocol));
        
        if (!hasValidProtocol) {
            errors.push(`${label}: Invalid Git URL. Must start with https://, http://, git@, ssh://, or git://`);
        }
        
        if (config.path.startsWith('git@') && !config.path.includes(':')) {
             errors.push(`${label}: Invalid SCP-like Git URL. Missing ':' separator.`);
        }
    }

    return errors;
  };

  const startWizard = () => {
      const sourceErrors = validateRepoConfig(source, 'Source');
      const targetErrors = validateRepoConfig(target, 'Target');
      
      const newErrorsState = {
          source: sourceErrors.length > 0,
          target: targetErrors.length > 0
      };

      setErrors(newErrorsState);

      if (sourceErrors.length > 0 || targetErrors.length > 0) {
          addLog('Validation failed:', 'error');
          sourceErrors.forEach(e => addLog(`• ${e}`, 'error'));
          targetErrors.forEach(e => addLog(`• ${e}`, 'error'));
          return;
      }
      
      setWizardStep(0);
      setLogs([]);
      addLog('Started configuration wizard.', 'info');
  };

  const copyToClipboard = () => {
      runLinter(); // Lint before action
      navigator.clipboard.writeText(generateFullScript());
      addLog('Script copied to clipboard.', 'success');
  };

  const downloadScript = () => {
      runLinter(); // Lint before action
      const content = generateFullScript();
      const blob = new Blob([content], { type: 'text/x-sh' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sync_script.sh';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('Script downloaded as sync_script.sh', 'success');
  };

  const handleWizardNext = () => {
      if (wizardStep === 3) {
          runLinter();
      }
      setWizardStep(prev => prev + 1);
  };

  const finishWizard = () => {
      setWizardStep(-1);
      // Add history entry
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
      addLog('Script generation completed.', 'success');
  };

  // --- Render Functions ---

  const renderWizardStep = () => {
    switch (wizardStep) {
        case 0: // System Tools
            return (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Step 1: System Environment</h3>
                        <div className="px-2 py-1 bg-blue-900/50 rounded text-blue-200 text-xs font-mono">1/5</div>
                    </div>
                    <p className="text-sm text-slate-400">Select your package manager and verify tool installation logic.</p>
                    
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Package Manager</label>
                            <select 
                                value={sysConfig.packageManager}
                                onChange={handlePmChange}
                                className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                <option value="apt">APT (Debian/Ubuntu)</option>
                                <option value="dnf">DNF (Fedora/RHEL)</option>
                                <option value="yum">YUM (CentOS/RHEL)</option>
                                <option value="pacman">Pacman (Arch)</option>
                                <option value="zypper">Zypper (OpenSUSE)</option>
                                <option value="brew">Homebrew (macOS)</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => toggleSysConfig('installTools')}
                            className="flex items-center gap-3 w-full p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors text-left"
                        >
                            {sysConfig.installTools ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-500" />}
                            <div>
                                <div className="text-sm font-medium text-slate-200">Detect & Install System Tools</div>
                                <div className="text-xs text-slate-500">Ensure git, curl, ssh are present</div>
                            </div>
                        </button>
                    </div>

                    <div className="bg-black/40 rounded border border-slate-800 p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileCode size={10}/> Preview</div>
                        <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-32 overflow-y-auto">
                           {generateCheckToolFunction() + '\n\n' + generateToolChecks()}
                        </code>
                    </div>
                </div>
            );
        case 1: // Firewall
            return (
                <div className="space-y-4 animate-fadeIn">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Step 2: Network Security</h3>
                        <div className="px-2 py-1 bg-blue-900/50 rounded text-blue-200 text-xs font-mono">2/5</div>
                    </div>
                    <p className="text-sm text-slate-400">Configure firewall rules to allow SSH and Web traffic during sync.</p>
                    
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                         <button 
                            onClick={() => toggleSysConfig('configureFirewall')}
                            className="flex items-center gap-3 w-full p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors text-left"
                        >
                            {sysConfig.configureFirewall ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-500" />}
                            <div>
                                <div className="text-sm font-medium text-slate-200">Configure Firewall</div>
                                <div className="text-xs text-slate-500">Opens ports 22 (SSH), 80/443 (HTTP/S)</div>
                            </div>
                        </button>
                    </div>

                    <div className="bg-black/40 rounded border border-slate-800 p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileCode size={10}/> Preview</div>
                        <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-40 overflow-y-auto">
                           {generateFirewallConfig()}
                        </code>
                    </div>
                </div>
            );
        case 2: // Dependencies
            return (
                <div className="space-y-4 animate-fadeIn">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Step 3: Dependencies</h3>
                        <div className="px-2 py-1 bg-blue-900/50 rounded text-blue-200 text-xs font-mono">3/5</div>
                    </div>
                    <p className="text-sm text-slate-400">Manage Python packages required for the synchronization scripts.</p>
                    
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-4">
                        <button 
                            onClick={() => toggleSysConfig('installDependencies')}
                            className="flex items-center gap-3 w-full p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors text-left"
                        >
                            {sysConfig.installDependencies ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-500" />}
                            <div>
                                <div className="text-sm font-medium text-slate-200">Install Python Dependencies</div>
                                <div className="text-xs text-slate-500">Generates requirements.txt and runs pip install</div>
                            </div>
                        </button>

                        {sysConfig.installDependencies && (
                            <div className="pl-8 space-y-2">
                                <div className="flex gap-2">
                                <input 
                                    value={newPackage} 
                                    onChange={(e) => setNewPackage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPackage()}
                                    placeholder="Add package (e.g. pandas)"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                                />
                                <button 
                                    onClick={handleAddPackage}
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-2 flex items-center justify-center transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                {sysConfig.pythonPackages.length === 0 && (
                                    <span className="text-xs text-slate-500 italic">No packages specified. Will use existing requirements.txt.</span>
                                )}
                                {sysConfig.pythonPackages.map(pkg => (
                                    <span key={pkg} className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 group">
                                        {pkg} 
                                        <button onClick={() => handleRemovePackage(pkg)} className="text-slate-500 group-hover:text-red-400"><X size={12} /></button>
                                    </span>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-black/40 rounded border border-slate-800 p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileCode size={10}/> Preview</div>
                        <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-40 overflow-y-auto">
                           {generateDependencies()}
                        </code>
                    </div>
                </div>
            );
        case 3: // Sync Options
            return (
                 <div className="space-y-4 animate-fadeIn">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Step 4: Sync Options</h3>
                        <div className="px-2 py-1 bg-blue-900/50 rounded text-blue-200 text-xs font-mono">4/5</div>
                    </div>
                    <p className="text-sm text-slate-400">Finalize the synchronization command parameters.</p>

                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-4">
                        <div className="text-sm text-slate-300 space-y-2">
                            <div className="flex gap-2">
                                <span className="text-slate-500 w-16">Source:</span>
                                <span className="font-mono text-emerald-400 truncate">{source.path}</span>
                            </div>
                             <div className="flex gap-2">
                                <span className="text-slate-500 w-16">Target:</span>
                                <span className="font-mono text-blue-400 truncate">{target.path}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-4 space-y-3">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                <div onClick={() => setTarget(prev => ({...prev, forceSudo: !prev.forceSudo}))}>
                                    {target.forceSudo ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-slate-500" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-200">Force Sudo</div>
                                    <div className="text-xs text-slate-500">Run sync command with elevated privileges</div>
                                </div>
                            </label>

                             <label className="flex items-center gap-3 cursor-pointer group">
                                <div onClick={() => setDryRun(!dryRun)}>
                                    {dryRun ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-500" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-200">Dry Run</div>
                                    <div className="text-xs text-slate-500">Simulate without changing files</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded border border-slate-800 p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileCode size={10}/> Preview</div>
                        <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-32 overflow-y-auto">
                           {generateSyncCommand()}
                        </code>
                    </div>
                </div>
            );
         case 4: // Final
            return (
                <div className="space-y-4 animate-fadeIn h-full flex flex-col">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Step 5: Generated Script</h3>
                        <div className="px-2 py-1 bg-green-900/50 rounded text-green-200 text-xs font-mono">Done</div>
                    </div>
                    <p className="text-sm text-slate-400">Your custom synchronization script is ready.</p>

                    <div className="flex-1 bg-black/40 rounded border border-slate-800 p-3 relative group">
                        <div className="absolute top-2 right-2 flex gap-2">
                             <button 
                                onClick={downloadScript}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded transition-colors"
                                title="Download .sh"
                             >
                                 <Download size={16} />
                             </button>
                             <button 
                                onClick={copyToClipboard}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded transition-colors"
                                title="Copy to Clipboard"
                             >
                                 <Copy size={16} />
                             </button>
                         </div>
                        <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block h-full overflow-y-auto pt-8">
                           {generateFullScript()}
                        </code>
                    </div>
                </div>
            );
        default: return null;
    }
  };

  const handleRollback = (id: number) => {
    // Rollback is manual in this context
    const confirm = window.confirm(`Rollback requires manual intervention for operation #${id}. View log details?`);
    if (confirm) {
        addLog(`Rollback requested for #${id}. Please manually restore from backup if available.`, 'warning');
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
        
        {/* Left Column: Configuration OR Wizard */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800/30 backdrop-blur rounded-xl border border-slate-700/50 p-1 h-full flex flex-col">
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2 mb-4">
              <Settings size={18} className="text-blue-400" />
              <h2 className="font-semibold text-slate-200">
                  {wizardStep >= 0 ? 'Script Wizard' : 'Configuration'}
              </h2>
            </div>
            
            <div className="px-4 pb-4 flex-1 flex flex-col space-y-6">
              
              {wizardStep === -1 ? (
                <>
                  {/* Default Configuration View */}
                  <PathSelector 
                    label="Source Repository" 
                    config={source} 
                    onChange={setSource}
                    error={errors.source} 
                  />

                  <div className="flex justify-center text-slate-600 relative group">
                    <button 
                      onClick={handleSwap}
                      className="bg-slate-800 p-2 rounded-full border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-blue-500 transition-all z-10 shadow-lg group-hover:scale-110"
                      title="Swap Source and Target"
                    >
                      <ArrowUpDown size={16} />
                    </button>
                    <div className="absolute h-full w-px bg-slate-800 top-0 left-1/2 -z-0"></div>
                  </div>

                  <PathSelector 
                    label="Target Repository" 
                    config={target} 
                    onChange={setTarget}
                    isTarget={true}
                    error={errors.target}
                  />

                   {/* Manual System Configuration Block - RESTORED */}
                   <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                            <ShieldAlert size={14} className="text-orange-400" />
                            <span>System Settings</span>
                        </div>
                        
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
                    
                    {/* Quick Access Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => toggleSysConfig('installTools')}
                            className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors text-left"
                        >
                            {sysConfig.installTools ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="text-slate-500" />}
                            <span className="text-xs text-slate-300">System Tools</span>
                        </button>
                         <button 
                            onClick={() => toggleSysConfig('configureFirewall')}
                            className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors text-left"
                        >
                            {sysConfig.configureFirewall ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="text-slate-500" />}
                            <span className="text-xs text-slate-300">Firewall</span>
                        </button>
                         <button 
                            onClick={() => toggleSysConfig('installDependencies')}
                            className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors text-left col-span-2"
                        >
                            {sysConfig.installDependencies ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="text-slate-500" />}
                            <span className="text-xs text-slate-300">Install Dependencies</span>
                        </button>
                    </div>
                  </div>

                  <div className="pt-2 mt-auto">
                    <button
                      onClick={startWizard}
                      className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 active:transform active:scale-[0.98]`}
                    >
                      <Play size={20} fill="currentColor" />
                      Generate Script
                    </button>
                  </div>
                  
                   {/* Command Preview (Compact) */}
                  <div className="bg-black/40 rounded border border-slate-800 p-3 mt-4">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Command size={10} /> Live Preview
                    </div>
                    <code className="text-xs font-mono text-emerald-400 break-all whitespace-pre-wrap block max-h-24 overflow-y-auto opacity-70">
                    {generateFullScript()}
                    </code>
                  </div>
                </>
              ) : (
                <>
                  {/* Wizard Step Content */}
                  <div className="flex-1">
                    {renderWizardStep()}
                  </div>

                  {/* Wizard Navigation */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-800 mt-auto">
                      {wizardStep < 4 && (
                          <button
                            onClick={() => setWizardStep(prev => Math.max(-1, prev - 1))}
                            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                          >
                             {wizardStep === 0 ? 'Cancel' : 'Back'}
                          </button>
                      )}
                      
                      {wizardStep === 4 ? (
                           <button
                            onClick={finishWizard}
                            className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                           >
                            <Check size={16} /> Finish
                           </button>
                      ) : (
                          <button
                            onClick={handleWizardNext}
                            className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                           >
                             Next <ChevronRight size={16} />
                           </button>
                      )}
                  </div>
                </>
              )}

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