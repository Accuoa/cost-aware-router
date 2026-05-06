import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

// Substitute ${VAR} or ${VAR:-default} with env values before YAML parsing.
// Matches POSIX-shell-like syntax so the same config.yml works natively (defaults)
// and inside docker-compose (env overrides via the compose `environment:` block).
export function substituteEnvVars(text, env) {
  return text.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/gi, (_, name, fallback) => {
    const val = env[name];
    if (val !== undefined && val !== '') return val;
    return fallback ?? '';
  });
}

export function loadConfig(path, env = process.env) {
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(`config file not found at ${path}: ${err.message}`);
  }
  return yaml.load(substituteEnvVars(raw, env));
}
