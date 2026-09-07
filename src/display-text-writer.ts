import { App, MarkdownView } from 'obsidian'
import { WikilinkHelperSettings } from './types'
import { parseWikilink } from './wikilink'

export class DisplayTextWriter {
    private app: App
    private getSettings: () => WikilinkHelperSettings

    constructor(app: App, getSettings: () => WikilinkHelperSettings) {
        this.app = app
        this.getSettings = getSettings
    }

    public handlePipeKey(event: KeyboardEvent) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!view) return

        const editor = view.editor
        const cursor = editor.getCursor()

        const target = this.plainLinkTargetBefore(editor.getLine(cursor.line), cursor.ch)
        if (target === null) return

        event.preventDefault()

        let displayText = target
        if (this.getSettings().lowercaseFirstChar) {
            displayText = displayText.charAt(0).toLowerCase() + displayText.slice(1)
        }

        // Insert and select the display text in one step, so it can be overtyped
        const displayStart = cursor.ch + 1
        editor.transaction({
            changes: [{ from: cursor, text: `|${displayText}` }],
            selection: {
                from: { line: cursor.line, ch: displayStart },
                to: { line: cursor.line, ch: displayStart + displayText.length }
            }
        })
    }

    /** The target of a plain wikilink whose closing `]]` begins at `cursorCh`, or null */
    private plainLinkTargetBefore(line: string, cursorCh: number): string | null {
        if (!line.startsWith(']]', cursorCh)) return null

        const start = line.lastIndexOf('[[', cursorCh)
        if (start === -1) return null

        const parsed = parseWikilink(line.slice(start, cursorCh + 2))
        if (!parsed || parsed.display !== null) return null

        return parsed.target
    }
}
