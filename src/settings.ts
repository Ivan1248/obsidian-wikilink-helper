import { App, PluginSettingTab, Setting } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'
import AutoWikilinkDisplayTextPlugin from './main'

export const DEFAULT_SETTINGS: AutoWikilinkDisplayTextSettings = {
    enableAutoDisplayText: true,
    lowercaseFirstChar: true,
    normalizeOnSave: false,
    onlyMatchExistingNotes: true
}

export class AutoWikilinkDisplayTextSettingTab extends PluginSettingTab {
    plugin: AutoWikilinkDisplayTextPlugin

    constructor(app: App, plugin: AutoWikilinkDisplayTextPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        new Setting(containerEl)
            .setName("Automatic display text insertion")
            .setHeading()

        new Setting(containerEl)
            .setName('Enable automatic display text insertion')
            .setDesc('Automatically insert display text when typing | at the end of a wikilink')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoDisplayText)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoDisplayText = value
                    await this.plugin.saveSettings()
                    this.display()
                }))

        if (this.plugin.settings.enableAutoDisplayText) {
            new Setting(containerEl)
                .setName('Lowercase first character')
                .setDesc('Automatically lowercase the first character of the inserted display text')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.lowercaseFirstChar)
                    .onChange(async (value) => {
                        this.plugin.settings.lowercaseFirstChar = value
                        await this.plugin.saveSettings()
                    }))
        }

        new Setting(containerEl)
            .setName("Wikilink normalization")
            .setHeading()

        containerEl.createEl('p', {
            text: 'Normalization ensures wikilinks use the correct file name casing. E.g., if the file is named "Note.md", then [[note]] and [[note|note]] are normalized to [[Note|note]], while [[Note]] is left unchanged. This is useful to prevent broken links in case-sensitive static site generators.',
            cls: 'setting-item-description'
        })

        new Setting(containerEl)
            .setName('Normalize on Ctrl+S')
            .setDesc('Normalize wikilinks when saving with Ctrl+S (Cmd+S on Mac)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.normalizeOnSave)
                .onChange(async (value) => {
                    this.plugin.settings.normalizeOnSave = value
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName('Only normalize links to existing notes')
            .setDesc('When disabled, also adds display text to links targeting non-existent notes if they start with a lowercase letter')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.onlyMatchExistingNotes)
                .onChange(async (value) => {
                    this.plugin.settings.onlyMatchExistingNotes = value
                    await this.plugin.saveSettings()
                }))
    }
}
