export type SourceType = 'local' | 'ssh' | 'git';
export type PackageManager = 'apt' | 'dnf' | 'yum' | 'pacman' | 'zypper' | 'brew';

export interface RepoConfig {
  type: SourceType;
  path: string;
  // SSH specific
  host?: string;
  user?: string;
  privateKeyPath?: string;
  // Git specific
  branch?: string;
  useGh?: boolean; // Use GitHub CLI
  forceSudo?: boolean; // Force usage of sudo for this path
}

export interface SystemConfig {
  packageManager: PackageManager;
  installDependencies: boolean;
  installTools: boolean; // gh, ssh, ufw, etc.
  configureFirewall: boolean;
}

export interface SyncLog {
  id: number;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface SyncOperation {
  id: number;
  timestamp: string;
  source: string;
  target: string;
  status: 'completed' | 'failed' | 'in_progress' | 'rolled_back';
  filesCopied: number;
  filesFailed: number;
  backupPath?: string;
}