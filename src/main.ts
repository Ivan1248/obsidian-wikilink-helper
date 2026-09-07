import { Plugin, Notice } from 'obsidian'
import { WikilinkHelperSettings } from './types'
import { DEFAULT_SETTINGS, WikilinkHelperSettingTab } from './settings'
import { WikilinkNormalizer } from './normalizer'
import { DisplayTextWriter } from './display-text-writer'
import { CommandInterceptor } from './command-interceptor'

export default class WikilinkHelperPlugin extends Plugin {
    /** Assigned by `loadSettings` before anything can read it, including the settings tab */
    settings!: WikilinkHelperSettings

    async onload() {
        await this.loadSettings()

        const normalizer = new WikilinkNormalizer(this.app, () => this.settings)
        const displayTextWriter = new DisplayTextWriter(this.app, () => this.settings)

        this.addChild(new CommandInterceptor(this.app, "editor:save-file", () => {
            if (this.settings.normalizeOnSave) {
                normalizer.normalizeCurrentFile()
            }
        }))

        this.addSettingTab(new WikilinkHelperSettingTab(this.app, this))

        // Existing behavior: listen for "|"
        this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
            if (event.key === '|' && this.settings.enableAutoDisplayText) {
                displayTextWriter.handlePipeKey(event)
            }
        })

        // Command: normalize current file
        this.addCommand({
            id: "normalize-wikilinks-current-file",
            name: "Normalize wikilinks in current file",
            editorCallback: () => {
                // Invoked explicitly, so say so when there was nothing to do
                if (normalizer.normalizeCurrentFile() === 0) {
                    new Notice("No wikilinks needed normalizing")
                }
            }
        })

        // Command: normalize all files
        this.addCommand({
            id: "normalize-wikilinks-all-files",
            name: "Normalize wikilinks in entire vault",
            callback: () => normalizer.normalizeAllFiles()
        })
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<WikilinkHelperSettings>)
    }
}
