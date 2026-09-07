import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { WikilinkHelperSettings } from './types'
import { parseWikilink } from './wikilink'

/**
 * CodeMirror extension that inserts display text when typing "|" in a wikilink.
 *
 * Uses CodeMirror's `inputHandler` rather than a key listener to support both hardware
 * and virtual keyboards.
 */
export function createDisplayTextExtension(
    getSettings: () => WikilinkHelperSettings
): Extension {
    return EditorView.inputHandler.of((view, from, to, text) => {
        // Only handle direct insertion of a single "|".
        if (text !== '|' || from !== to) return false
        if (!getSettings().enableAutoDisplayText) return false

        const line = view.state.doc.lineAt(from)
        const target = plainLinkTargetBefore(line.text, from - line.from)
        if (target === null) return false

        let displayText = target
        if (getSettings().lowercaseFirstChar) {
            displayText = displayText.charAt(0).toLowerCase() + displayText.slice(1)
        }

        // Insert and select the display text.
        // Omitting `userEvent` preserves this as an independent undo step.
        const displayStart = from + 1
        view.dispatch({
            changes: { from, insert: `|${displayText}` },
            selection: { anchor: displayStart, head: displayStart + displayText.length },
            // Keep the selection visible above on-screen keyboards
            scrollIntoView: true
        })

        // Handled, prevent default insertion of "|"
        return true
    })
}

/** Returns the target of a plain wikilink ending at `cursorCh`, or null. */
function plainLinkTargetBefore(line: string, cursorCh: number): string | null {
    if (!line.startsWith(']]', cursorCh)) return null

    const start = line.lastIndexOf('[[', cursorCh)
    if (start === -1) return null

    const parsed = parseWikilink(line.slice(start, cursorCh + 2))
    if (!parsed || parsed.display !== null) return null

    return parsed.target
}
