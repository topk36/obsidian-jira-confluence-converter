import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { markdownToConfluenceStorage, markdownToJira } from './converters';

type Converter = (markdown: string) => string;
type DefaultRibbonAction = 'jira' | 'confluence' | 'both';

interface JiraConfluenceConverterSettings {
  defaultRibbonAction: DefaultRibbonAction;
  showRibbonIcon: boolean;
}

const DEFAULT_SETTINGS: JiraConfluenceConverterSettings = {
  defaultRibbonAction: 'jira',
  showRibbonIcon: true,
};

function isDefaultRibbonAction(value: unknown): value is DefaultRibbonAction {
  return value === 'jira' || value === 'confluence' || value === 'both';
}

function parseSettings(data: unknown): JiraConfluenceConverterSettings {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const saved = data as Partial<Record<keyof JiraConfluenceConverterSettings, unknown>>;
  return {
    defaultRibbonAction: isDefaultRibbonAction(saved.defaultRibbonAction) ? saved.defaultRibbonAction : DEFAULT_SETTINGS.defaultRibbonAction,
    showRibbonIcon: typeof saved.showRibbonIcon === 'boolean' ? saved.showRibbonIcon : DEFAULT_SETTINGS.showRibbonIcon,
  };
}

export default class JiraConfluenceConverterPlugin extends Plugin {
  settings: JiraConfluenceConverterSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: 'copy-as-jira-wiki-markup',
      name: 'Copy selection/note as Jira Wiki Markup',
      editorCallback: async (editor) => {
        await this.copyConvertedMarkdown('Jira Wiki Markup', markdownToJira, editor.getSelection() || editor.getValue());
      },
    });

    this.addCommand({
      id: 'copy-as-confluence-storage',
      name: 'Copy selection/note as Confluence Storage XHTML',
      editorCallback: async (editor) => {
        await this.copyConvertedMarkdown('Confluence Storage XHTML', markdownToConfluenceStorage, editor.getSelection() || editor.getValue());
      },
    });

    this.addCommand({
      id: 'copy-as-jira-and-confluence',
      name: 'Copy selection/note as Jira and Confluence bundle',
      editorCallback: async (editor) => {
        await this.copyBothFormats(editor.getSelection() || editor.getValue());
      },
    });

    if (this.settings.showRibbonIcon) {
      this.addRibbonIcon('copy', 'Copy note for Jira/Confluence', async () => {
        await this.runRibbonAction();
      });
    }

    this.addSettingTab(new JiraConfluenceConverterSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private getActiveMarkdown(): string | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return null;
    }
    return view.editor.getSelection() || view.editor.getValue();
  }

  private async runRibbonAction(): Promise<void> {
    const markdown = this.getActiveMarkdown();
    if (markdown === null) {
      new Notice('Open a Markdown note first.');
      return;
    }

    if (this.settings.defaultRibbonAction === 'confluence') {
      await this.copyConvertedMarkdown('Confluence Storage XHTML', markdownToConfluenceStorage, markdown);
      return;
    }

    if (this.settings.defaultRibbonAction === 'both') {
      await this.copyBothFormats(markdown);
      return;
    }

    await this.copyConvertedMarkdown('Jira Wiki Markup', markdownToJira, markdown);
  }

  private async copyBothFormats(markdown: string): Promise<void> {
    if (!markdown.trim()) {
      new Notice('Nothing to convert.');
      return;
    }

    const converted = [
      '# Jira Wiki Markup',
      markdownToJira(markdown),
      '',
      '# Confluence Storage XHTML',
      markdownToConfluenceStorage(markdown),
    ].join('\n');

    if (await this.writeClipboard(converted)) {
      new Notice('Copied Jira and Confluence formats.');
    }
  }

  private async copyConvertedMarkdown(label: string, converter: Converter, markdown: string): Promise<void> {
    if (!markdown.trim()) {
      new Notice('Nothing to convert.');
      return;
    }

    const converted = converter(markdown);
    if (await this.writeClipboard(converted)) {
      new Notice(`Copied as ${label}.`);
    }
  }

  private async writeClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to write converted content to clipboard', error);
      new Notice('Failed to copy to clipboard. See console for details.');
      return false;
    }
  }
}

class JiraConfluenceConverterSettingTab extends PluginSettingTab {
  plugin: JiraConfluenceConverterPlugin;

  constructor(app: App, plugin: JiraConfluenceConverterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('Jira Confluence Converter').setHeading();

    new Setting(containerEl)
      .setName('Show ribbon icon')
      .setDesc('Adds a left-sidebar action that converts the active selection or note.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();
            new Notice('Reload Obsidian to apply the ribbon icon setting.');
          }),
      );

    new Setting(containerEl)
      .setName('Ribbon icon action')
      .setDesc('Choose what the ribbon icon copies to the clipboard.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('jira', 'Jira Wiki Markup')
          .addOption('confluence', 'Confluence Storage XHTML')
          .addOption('both', 'Both formats')
          .setValue(this.plugin.settings.defaultRibbonAction)
          .onChange(async (value) => {
            this.plugin.settings.defaultRibbonAction = value as DefaultRibbonAction;
            await this.plugin.saveSettings();
          }),
      );
  }
}
