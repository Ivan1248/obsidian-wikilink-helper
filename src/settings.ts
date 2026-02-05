import { App, PluginSettingTab, Setting } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'
import AutoWikilinkDisplayTextPlugin from './main'

export const DEFAULT_SETTINGS: AutoWikilinkDisplayTextSettings = {
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
            .setName("Auto display text")
            .setHeading()

        new Setting(containerEl)
            .setName('Lowercase first character')
            .setDesc('Automatically lowercase the first character of the display text')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.lowercaseFirstChar)
                .onChange(async (value) => {
                    this.plugin.settings.lowercaseFirstChar = value
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName("Wikilink normalization")
            .setHeading()

        new Setting(containerEl)
            .setName('Normalize on Ctrl+S')
            .setDesc('Automatically normalize wikilinks in the current file when you press Ctrl+S (or Cmd+S)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.normalizeOnSave)
                .onChange(async (value) => {
                    this.plugin.settings.normalizeOnSave = value
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName('Only normalize links to existing notes')
            .setDesc('Only normalize links to files that exist in the vault')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.onlyMatchExistingNotes)
                .onChange(async (value) => {
                    this.plugin.settings.onlyMatchExistingNotes = value
                    await this.plugin.saveSettings()
                }))
    }
}
