/** A wikilink split into its target and its display text, if it has one */
export interface ParsedWikilink {
    target: string
    display: string | null
}

/**
 * Split a wikilink into target and display text, or null if `text` is not exactly one
 * wikilink. This is the single definition of what the plugin treats as a plain wikilink.
 */
export function parseWikilink(text: string): ParsedWikilink | null {
    if (!text.startsWith("[[") || !text.endsWith("]]")) return null

    const inner = text.slice(2, -2)
    if (inner.length === 0 || /[[\]\n]/.test(inner)) return null

    const pipeIndex = inner.indexOf("|")
    return pipeIndex === -1
        ? { target: inner, display: null }
        : { target: inner.slice(0, pipeIndex), display: inner.slice(pipeIndex + 1) }
}
