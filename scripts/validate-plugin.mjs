import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const requiredFiles = ['manifest.json', 'versions.json', 'main.js', 'styles.css'];
const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    errors.push(`Missing required release file: ${file}`);
  }
}

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));

const idPattern = /^[a-z0-9-]+$/;
if (!idPattern.test(manifest.id)) {
  errors.push('manifest.id must be lowercase kebab-case.');
}

const namePattern = /^[A-Za-z0-9 ()+-]+$/;
if (!namePattern.test(manifest.name)) {
  errors.push('manifest.name must use Basic Latin letters/numbers/spaces only; allowed punctuation: hyphen, plus sign, and parentheses.');
}

if (/obsidian|obsi-|sidian/i.test(manifest.name)) {
  errors.push('manifest.name must not include Obsidian or Obsidian-like variations.');
}

if (/\bplugin\b/i.test(manifest.name)) {
  errors.push('manifest.name must not include the word Plugin.');
}

for (const field of ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'isDesktopOnly']) {
  if (!(field in manifest)) {
    errors.push(`manifest.json is missing ${field}.`);
  }
}

if (manifest.version !== packageJson.version) {
  errors.push(`manifest.version (${manifest.version}) must equal package.json version (${packageJson.version}).`);
}

if (!(manifest.version in versions)) {
  errors.push(`versions.json must contain ${manifest.version}.`);
}

if (versions[manifest.version] !== manifest.minAppVersion) {
  errors.push(`versions.json ${manifest.version} must equal minAppVersion ${manifest.minAppVersion}.`);
}

if (manifest.description.length > 250) {
  errors.push('manifest.description should stay concise for the community plugins list.');
}

if (basename(process.cwd()) !== packageJson.name) {
  console.warn(`Warning: package folder name (${basename(process.cwd())}) differs from package name (${packageJson.name}).`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('plugin package validation passed');
