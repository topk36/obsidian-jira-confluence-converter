# Jira & Confluence Converter

Copy Markdown from Obsidian as Atlassian-friendly markup.

This plugin converts the current selection — or the whole active note when nothing is selected — and copies the result to your clipboard.

- **Jira Wiki Markup** for Jira Server/Data Center fields that use the wiki renderer.
- **Confluence Storage XHTML** for Confluence pages, templates, and REST API payloads.

The plugin works offline. It does not send your notes to Jira, Confluence, or any third-party service.

## Features

- Copy selected Markdown or the entire current note.
- Convert to Jira Wiki Markup.
- Convert to Confluence Storage XHTML.
- Copy both formats in one bundle.
- Optional ribbon icon with a configurable default action.
- Works on desktop and mobile Obsidian.

## Commands

Open the command palette and run one of these commands:

- `Jira & Confluence Converter: Copy selection/note as Jira Wiki Markup`
- `Jira & Confluence Converter: Copy selection/note as Confluence Storage XHTML`
- `Jira & Confluence Converter: Copy selection/note as Jira and Confluence bundle`

## Supported Markdown

- Headings `#` through `######`
- Paragraphs and line breaks
- Bold, italic, inline code
- Links and images
- Bullet and numbered lists, including indentation-based nesting
- Blockquotes
- Fenced code blocks with language hints
- Simple pipe tables
- Horizontal rules

This is a pragmatic Markdown converter, not a full CommonMark or HTML renderer. Complex embedded HTML, callouts, footnotes, math, Dataview blocks, and Obsidian-specific transclusions are converted best-effort or kept as plain text.

## Settings

The settings tab lets you:

- show or hide the ribbon icon;
- choose whether the ribbon icon copies Jira markup, Confluence storage XHTML, or both formats.

## Installation

### From Obsidian community plugins

Once the plugin is accepted into the community plugin directory:

1. Open `Settings → Community plugins`.
2. Search for `Jira & Confluence Converter`.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Copy them into this folder inside your vault:

   ```text
   .obsidian/plugins/jira-confluence-converter/
   ```

3. Reload Obsidian.
4. Enable **Jira & Confluence Converter** in `Settings → Community plugins`.

## Privacy

All conversion happens locally inside Obsidian. The plugin does not make network requests and does not collect telemetry.

## Limitations

- Jira Cloud's newer rich-text fields may use Atlassian Document Format instead of Jira Wiki Markup.
- Confluence output targets Storage XHTML, which is most useful for Confluence REST/API workflows and advanced paste/import scenarios.
- Complex Markdown extensions are handled best-effort.

## License

MIT
