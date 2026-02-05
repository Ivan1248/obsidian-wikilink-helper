import { App, MarkdownView } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'

export class DisplayTextWriter {
    private app: App
    private settings: AutoWikilinkDisplayTextSettings

    constructor(app: App, settings: AutoWikilinkDisplayTextSettings) {
        this.app = app
        this.settings = settings
    }

    public handlePipeKey(event: KeyboardEvent) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!view) return

        const editor = view.editor
        const cursor = editor.getCursor()

        const linkInfo = this.findWikilinkAtCursor(editor.getLine(cursor.line), cursor.ch)
        if (!linkInfo || cursor.ch !== linkInfo.end - 2) return

        event.preventDefault()

        let displayText = linkInfo.linkText
        if (this.settings.lowercaseFirstChar && displayText.length > 0) {
            displayText = displayText.charAt(0).toLowerCase() + displayText.slice(1)
        }

        editor.replaceRange(`|${displayText}`, cursor)
        editor.setCursor({ line: cursor.line, ch: cursor.ch + 1 })
    }

    private findWikilinkAtCursor(line: string, cursorCh: number): { start: number; end: number; linkText: string } | null {
        const start = line.lastIndexOf('[[', cursorCh)
        if (start === -1) return null
        const end = line.indexOf(']]', cursorCh) + 2
        if (end === -1) return null

        const content = line.substring(start, end)
        if (!/^\[\[[^[\]|]+\]\]$/.test(content)) return null

        return { start: start, end: end, linkText: content.slice(2, -2) }
    }
}
