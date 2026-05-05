import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

export function loadConfig(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(`config file not found at ${path}: ${err.message}`);
  }
  return yaml.load(raw);
}
