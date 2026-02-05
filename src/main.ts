import { Plugin, MarkdownView } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'
import { DEFAULT_SETTINGS, AutoWikilinkDisplayTextSettingTab } from './settings'
import { WikilinkNormalizer } from './normalizer'
import { DisplayTextWriter } from './display-text-writer'
import { CommandInterceptor } from './command-interceptor'

export default class AutoWikilinkDisplayTextPlugin extends Plugin {
	settings: AutoWikilinkDisplayTextSettings
	normalizer: WikilinkNormalizer
	displayTextWriter: DisplayTextWriter
	commandInterceptor: CommandInterceptor

	async onload() {
		await this.loadSettings()
		this.normalizer = new WikilinkNormalizer(this.app, this.settings)
		this.displayTextWriter = new DisplayTextWriter(this.app, this.settings)
		this.commandInterceptor = new CommandInterceptor(this.app, "editor:save-file", () => {
			if (this.settings.normalizeOnSave) {
				this.normalizer.normalizeCurrentFile()
			}
		})
		this.addChild(this.commandInterceptor)

		this.addSettingTab(new AutoWikilinkDisplayTextSettingTab(this.app, this))

		// Existing behavior: listen for "|"
		this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
			if (event.key === '|' && this.settings.enableAutoDisplayText) {
				this.displayTextWriter.handlePipeKey(event)
			}
		})

		// Invalidate normalizer cache on vault changes
		this.registerEvent(this.app.vault.on('create', () => this.normalizer.invalidateCache()))
		this.registerEvent(this.app.vault.on('delete', () => this.normalizer.invalidateCache()))
		this.registerEvent(this.app.vault.on('rename', () => this.normalizer.invalidateCache()))

		// Command: normalize current file
		this.addCommand({
			id: "normalize-wikilinks-current-file",
			name: "Normalize wikilinks in current file",
			editorCheckCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (!view) return false
				if (!checking) this.normalizer.normalizeCurrentFile()
				return true
			}
		})

		// Command: normalize all files
		this.addCommand({
			id: "normalize-wikilinks-all-files",
			name: "Normalize wikilinks in entire vault",
			callback: () => this.normalizer.normalizeAllFiles()
		})
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
