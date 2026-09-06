import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'
import AutoWikilinkDisplayTextPlugin from './main'

export const DEFAULT_SETTINGS: AutoWikilinkDisplayTextSettings = {
    enableAutoDisplayText: true,
    lowercaseFirstChar: true,
    normalizeOnSave: false,
    onlyMatchExistingNotes: true
}

export class AutoWikilinkDisplayTextSettingTab extends PluginSettingTab {
    constructor(app: App, public plugin: AutoWikilinkDisplayTextPlugin) {
        super(app, plugin)
    }

    /**
     * Declarative settings (requires Obsidian 1.13.0+, see manifest minAppVersion).
     * The tab is rendered and indexed for settings search from these definitions.
     */
    getSettingDefinitions(): SettingDefinitionItem<keyof AutoWikilinkDisplayTextSettings>[] {
        return [
            {
                type: 'group',
                heading: 'Automatic display text insertion',
                items: [
                    {
                        name: 'Enable automatic display text insertion',
                        desc: 'Insert display text when typing | at the end of a wikilink.',
                        control: {
                            type: 'toggle',
                            key: 'enableAutoDisplayText'
                        }
                    },
                    {
                        name: 'Lowercase first character',
                        desc: 'Lowercase the first character of the inserted display text.',
                        visible: () => this.plugin.settings.enableAutoDisplayText,
                        control: {
                            type: 'toggle',
                            key: 'lowercaseFirstChar'
                        }
                    }
                ]
            },
            {
                type: 'group',
                heading: 'Wikilink normalization',
                items: [
                    {
                        name: 'About normalization',
                        desc: 'Normalization ensures that wikilinks use the correct file name casing. E.g., if the file is named "Note.md", then [[note]] and [[note|note]] are normalized to [[Note|note]], while [[Note]] is left unchanged. This is useful to prevent broken links in case-sensitive static site generators.'
                    },
                    {
                        name: 'Normalize on save command',
                        desc: 'Normalize wikilinks when saving with Ctrl+S (Cmd+S on Mac).',
                        control: {
                            type: 'toggle',
                            key: 'normalizeOnSave'
                        }
                    },
                    {
                        name: 'Only normalize links to existing notes',
                        desc: 'When disabled, also adds display text to links that start with a lowercase letter and target non-existent notes.',
                        control: {
                            type: 'toggle',
                            key: 'onlyMatchExistingNotes'
                        }
                    }
                ]
            }
        ]
    }
}
