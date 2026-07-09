import * as assert from 'node:assert/strict';
import { markdownToConfluenceStorage, markdownToJira } from '../src/converters';

const sample = `# Title

Hello **bold** and _italic_ with [link](https://example.com).

- item one
  - nested item
1. first

> quoted

\`inline\`

\`\`\`ts
const value = 1 < 2;
\`\`\`

| Name | Value |
| --- | --- |
| A | **B** |
`;

const jira = markdownToJira(sample);
assert.match(jira, /^h1\. Title/m);
assert.match(jira, /Hello \*bold\* and _italic_ with \[link\|https:\/\/example\.com\]\./);
assert.match(jira, /^\* item one/m);
assert.match(jira, /^\*\* nested item/m);
assert.match(jira, /^# first/m);
assert.match(jira, /^bq\. quoted/m);
assert.match(jira, /\{\{inline\}\}/);
assert.match(jira, /\{code:language=ts\}\nconst value = 1 < 2;\n\{code\}/);
assert.match(jira, /\|\|Name\|\|Value\|\|/);
assert.match(jira, /\|A\|\*B\*\|/);

const confluence = markdownToConfluenceStorage(sample);
assert.match(confluence, /<h1>Title<\/h1>/);
assert.match(confluence, /<strong>bold<\/strong>/);
assert.match(confluence, /<em>italic<\/em>/);
assert.match(confluence, /<a href=\"https:\/\/example\.com\">link<\/a>/);
assert.match(confluence, /<ul>\n<li>item one<\/li>\n<ul>\n<li>nested item<\/li>\n<\/ul>\n<\/ul>/);
assert.match(confluence, /<ol>\n<li>first<\/li>\n<\/ol>/);
assert.match(confluence, /<blockquote><p>quoted<\/p><\/blockquote>/);
assert.match(confluence, /<code>inline<\/code>/);
assert.match(confluence, /<ac:parameter ac:name=\"language\">ts<\/ac:parameter>/);
assert.match(confluence, /const value = 1 < 2;/);
assert.match(confluence, /<table><tbody><tr><th>Name<\/th><th>Value<\/th><\/tr><tr><td>A<\/td><td><strong>B<\/strong><\/td><\/tr><\/tbody><\/table>/);

console.log('converter tests passed');
