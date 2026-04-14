import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.prototype-share');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  apiUrl: string;
  apiKey?: string;
  publishCount: number;
}

const DEFAULT_CONFIG: Config = {
  apiUrl: 'https://prototype-share.vercel.app',
  publishCount: 0,
};

export function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function incrementPublishCount(): Config {
  const config = loadConfig();
  config.publishCount++;
  saveConfig(config);
  return config;
}
