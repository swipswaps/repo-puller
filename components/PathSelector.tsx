import React from 'react';
import { Folder, Terminal, GitBranch, Globe } from 'lucide-react';
import { SourceType, RepoConfig } from '../types';

interface PathSelectorProps {
  label: string;
  config: RepoConfig;
  onChange: (config: RepoConfig) => void;
}

const PathSelector: React.FC<PathSelectorProps> = ({ label, config, onChange }) => {
  
  const handleTypeChange = (type: SourceType) => {
    onChange({ ...config, type, path: '' });
  };

  const handleChange = (field: keyof RepoConfig, value: string) => {
    onChange({ ...config, [field]: value });
  };

  const getPlaceholder = () => {
    switch (config.type) {
      case 'local': return '/home/user/documents/my-repo';
      case 'ssh': return '/var/www/html/repo';
      case 'git': return 'https://github.com/username/repo.git';
    }
  };

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{label}</label>
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
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            {config.type === 'local' ? 'Absolute Path' : config.type === 'ssh' ? 'Remote Path' : 'Repository URL'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.path}
              onChange={(e) => handleChange('path', e.target.value)}
              placeholder={getPlaceholder()}
              className={`w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none transition-colors pl-9 ${
                 config.type === 'local' ? 'focus:border-blue-500' : config.type === 'ssh' ? 'focus:border-purple-500' : 'focus:border-orange-500'
              }`}
            />
            <div className="absolute left-3 top-2.5 text-slate-500">
               {config.type === 'local' && <Folder size={14} />}
               {config.type === 'ssh' && <Terminal size={14} />}
               {config.type === 'git' && <Globe size={14} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathSelector;