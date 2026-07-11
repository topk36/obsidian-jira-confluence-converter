# Changelog

## 0.2.0

- Replace Confluence Storage XHTML clipboard output with rich HTML that can be pasted directly into the Confluence editor.
- Add both `text/html` and `text/plain` clipboard representations for Confluence copies.
- Replace Confluence storage macros with standard HTML elements for code blocks and images.
- Remove the combined Jira and Confluence output option and command.
- Migrate previously saved `both` ribbon settings back to the default Jira action.
- Render valid nested list HTML for Confluence.
- Convert Markdown task lists to portable `☐` and `☑` markers.
- Convert Markdown strikethrough to Jira and Confluence equivalents.
- Omit YAML frontmatter from exported content by default.
- Convert Obsidian wikilinks to their display text.
- Move converter coverage to fixture-based tests.

## 0.1.1

- Fix Obsidian community plugin review issues.
- Remove generated `main.js` from source control; it is now intended to be attached as a GitHub Release asset.
- Update settings UI to follow Obsidian `Setting` API guidelines.
- Harden saved settings parsing to avoid unsafe assignments from persisted plugin data.
- Remove unnecessary string escapes in Confluence Storage XHTML conversion output.
- Add release workflow support for attaching `main.js`, `manifest.json`, and `styles.css` to the matching GitHub Release.

## 0.1.0

- Initial public MVP.
- Copy current selection or note as Jira Wiki Markup.
- Copy current selection or note as Confluence Storage XHTML.
- Support headings, emphasis, inline code, links, images, lists, blockquotes, fenced code blocks, simple tables, horizontal rules, and paragraphs.
- Add settings for the ribbon icon action.
