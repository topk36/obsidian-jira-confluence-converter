# Jira Confluence Converter

Copy Markdown from Obsidian as Atlassian-friendly markup.

This plugin converts the current selection — or the whole active note when nothing is selected — and writes the converted result to your clipboard.

- **Jira Wiki Markup** for Jira Server/Data Center fields that use the wiki renderer.
- **Confluence rich text** that can be pasted directly into the Confluence editor.

The plugin works offline. It does not send your notes to Jira, Confluence, or any third-party service.

## Features

- Copy selected Markdown or the entire current note.
- Convert to Jira Wiki Markup.
- Copy formatted rich text for direct pasting into Confluence.
- Optional ribbon icon with a configurable default action.
- Works on desktop and mobile Obsidian.

## Commands

Open the command palette and run one of these commands:

- `Jira Confluence Converter: Copy selection/note as Jira Wiki Markup`
- `Jira Confluence Converter: Copy selection/note for Confluence`

## Supported Markdown

- Headings `#` through `######`
- Paragraphs and line breaks
- Bold, italic, inline code
- Strikethrough
- Links and images
- Bullet and numbered lists, including indentation-based nesting
- Task lists
- Blockquotes
- Fenced code blocks with language hints
- Simple pipe tables
- Horizontal rules
- Obsidian wikilinks (converted to their display text)
- YAML frontmatter removal

This is a pragmatic Markdown converter, not a full CommonMark or HTML renderer. Complex embedded HTML, callouts, footnotes, math, Dataview blocks, and Obsidian-specific transclusions are converted best-effort or kept as plain text.

YAML frontmatter at the beginning of a note is omitted from exported content. Task list states are represented with `☐` and `☑` so they remain readable after pasting into Jira or Confluence.

## Settings

The settings tab lets you:

- show or hide the ribbon icon;
- choose whether the ribbon icon copies Jira markup or Confluence rich text.

## Installation

### From Obsidian community plugins

Once the plugin is accepted into the community plugin directory:

1. Open `Settings → Community plugins`.
2. Search for `Jira Confluence Converter`.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Copy them into this folder inside your vault:

   ```text
   .obsidian/plugins/jira-confluence-converter/
   ```

3. Reload Obsidian.
4. Enable **Jira Confluence Converter** in `Settings → Community plugins`.

## Privacy and clipboard access

All conversion happens locally inside Obsidian. The plugin does not make network requests and does not collect telemetry.

The plugin writes converted text to the system clipboard when you run a copy command. For Confluence, it writes both rich HTML and a plain Markdown fallback so you can paste formatted content directly into the editor. It does not read from the clipboard.

## Limitations

- Jira Cloud's newer rich-text fields may use Atlassian Document Format instead of Jira Wiki Markup.
- Rich clipboard support depends on the platform. If rich clipboard access is unavailable, the plugin copies the original Markdown as a fallback.
- Complex Markdown extensions are handled best-effort.

## License

MIT
