import * as assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { markdownToConfluenceHtml, markdownToJira } from '../src/converters';

const fixturesRoot = join(process.cwd(), 'test', 'fixtures');
const fixtureNames = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const fixtureName of fixtureNames) {
  const fixtureDir = join(fixturesRoot, fixtureName);
  const input = readFileSync(join(fixtureDir, 'input.md'), 'utf8');
  const expectedJira = readFileSync(join(fixtureDir, 'jira.txt'), 'utf8').trimEnd();
  const expectedConfluence = readFileSync(join(fixtureDir, 'confluence.html'), 'utf8').trimEnd();

  assert.equal(markdownToJira(input), expectedJira, `${fixtureName}: Jira output`);
  assert.equal(markdownToConfluenceHtml(input), expectedConfluence, `${fixtureName}: Confluence output`);
  assert.doesNotMatch(markdownToConfluenceHtml(input), /<ac:|<ri:/, `${fixtureName}: Confluence output must be pasteable HTML`);
}

console.log(`converter fixture tests passed (${fixtureNames.length} fixtures)`);
