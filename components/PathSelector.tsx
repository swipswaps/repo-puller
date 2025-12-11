import React from 'react';
import { Folder, Terminal, GitBranch, Globe, Shield, Github, Key } from 'lucide-react';
import { SourceType, RepoConfig } from '../types';

interface PathSelectorProps {
  label: string;
  config: RepoConfig;
  onChange: (config: RepoConfig) => void;
  isTarget?: boolean;
  error?: boolean;
}

const PathSelector: React.FC<PathSelectorProps> = ({ label, config, onChange, isTarget, error }) => {
  
  const handleTypeChange = (type: SourceType) => {
    onChange({ ...config, type, path: '' });
  };

  const handleChange = (field: keyof RepoConfig, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const getPlaceholder = () => {
    switch (config.type) {
      case 'local': return '/home/user/documents/my-repo';
      case 'ssh': return '/var/www/html/repo';
      case 'git': return 'https://github.com/username/repo.git';
    }
  };

  // Heuristic for sudo suggestion
  const looksLikeSystemPath = config.path.startsWith('/') && 
    !config.path.startsWith('/home') && 
    !config.path.startsWith('/Users') && 
    !config.path.startsWith('/tmp');

  return (
    <div className={`bg-slate-800/50 p-4 rounded-lg border transition-all hover:border-slate-600 ${error ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-slate-700'}`}>
      <div className="flex items-center justify-between mb-3">
        <label className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${error ? 'text-red-400' : 'text-slate-300'}`}>
          {label}
          {config.type === 'git' && config.path.includes('github.com') && (
            <Github size={14} className="text-slate-500" />
          )}
        </label>
        <div className="flex bg-slate-900 rounded-md p-0.5">
          <button
            onClick={() => handleTypeChange('local')}
            className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors ${
              config.type === 'local' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder size={12} /> Local
          </button>
          <button
            onClick={() => handleTypeChange('ssh')}
            className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors ${
              config.type === 'ssh' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={12} /> SSH
          </button>
          <button
            onClick={() => handleTypeChange('git')}
            className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors ${
              config.type === 'git' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch size={12} /> Git
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {config.type === 'ssh' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">User</label>
                <input
                  type="text"
                  value={config.user || ''}
                  onChange={(e) => handleChange('user', e.target.value)}
                  placeholder="root"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Host</label>
                <input
                  type="text"
                  value={config.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="192.168.1.10"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Private Key Path (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={config.privateKeyPath || ''}
                  onChange={(e) => handleChange('privateKeyPath', e.target.value)}
                  placeholder="~/.ssh/id_rsa"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors pl-8"
                />
                <div className="absolute left-2.5 top-2.5 text-slate-500">
                  <Key size={14} />
                </div>
              </div>
            </div>
          </div>
        )}

        {config.type === 'git' && (
          <div className="animate-fadeIn">
            <label className="block text-xs text-slate-500 mb-1">Branch (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={config.branch || ''}
                onChange={(e) => handleChange('branch', e.target.value)}
                placeholder="main"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500 transition-colors pl-8"
              />
              <div className="absolute left-2.5 top-2.5 text-slate-500">
                <GitBranch size={14} />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            {config.type === 'local' ? 'Absolute Path' : config.type === 'ssh' ? 'Remote Path' : 'Repository URL'}
          </label>
          <div className="relative group">
            <input
              type="text"
              value={config.path}
              onChange={(e) => handleChange('path', e.target.value)}
              placeholder={getPlaceholder()}
              className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-slate-200 focus:outline-none transition-colors pl-9 ${
                 error ? 'border-red-500/50' : 'border-slate-700'
              } ${
                 config.type === 'local' ? 'focus:border-blue-500' : config.type === 'ssh' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
            <div className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-slate-300 transition-colors">
               {config.type === 'local' && <Folder size={14} />}
               {config.type === 'ssh' && <Terminal size={14} />}
               {config.type === 'git' && <Globe size={14} />}
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="flex items-center gap-4 pt-1">
          {config.type === 'git' && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={config.useGh || false}
                onChange={(e) => handleChange('useGh', e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-orange-600 focus:ring-orange-500/50 focus:ring-offset-0 w-4 h-4"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Use GitHub CLI (gh)</span>
            </label>
          )}

          {isTarget && config.type === 'local' && (looksLikeSystemPath || config.forceSudo) && (
            <label className="flex items-center gap-2 cursor-pointer group animate-fadeIn">
              <input
                type="checkbox"
                checked={config.forceSudo || false}
                onChange={(e) => handleChange('forceSudo', e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500/50 focus:ring-offset-0 w-4 h-4"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                <Shield size={10} className={config.forceSudo ? "text-red-400" : ""} />
                Run as sudo
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathSelector;