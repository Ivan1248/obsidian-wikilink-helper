import { App, MarkdownView, Notice, CachedMetadata, TFile, parseLinktext } from 'obsidian'
import { WikilinkHelperSettings } from './types'
import { ParsedWikilink, parseWikilink } from './wikilink'

/** A rewrite of one wikilink, as offsets in the original text */
interface LinkReplacement {
    start: number
    end: number
    replacement: string
}

export class WikilinkNormalizer {
    private app: App
    private getSettings: () => WikilinkHelperSettings
    private isNormalizing = false

    constructor(app: App, getSettings: () => WikilinkHelperSettings) {
        this.app = app
        this.getSettings = getSettings
    }

    /**
     * Normalize current file using editor. Returns how many links were normalized, or null if
     * there was no active file.
     */
    public normalizeCurrentFile(): number | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!view?.file) return null

        const file = view.file
        const editor = view.editor
        const cache = this.app.metadataCache.getFileCache(file)
        if (!cache?.links?.length) return 0

        const replacements = this.findLinkReplacements(cache, editor.getValue(), file.path)
        if (replacements.length === 0) return 0

        // A single transaction so the whole normalization is one undo step.
        // The offsets index the string just read from the editor, and nothing can edit
        // it in between, so offsetToPos maps them back exactly.
        editor.transaction({
            changes: replacements.map(({ start, end, replacement }) => ({
                from: editor.offsetToPos(start),
                to: editor.offsetToPos(end),
                text: replacement
            }))
        })

        new Notice(`Normalized ${replacements.length} wikilink(s)`)
        return replacements.length
    }

    public async normalizeAllFiles(): Promise<void> {
        if (this.isNormalizing) return

        this.isNormalizing = true
        try {
            let fileCount = 0
            let linkCount = 0

            for (const file of this.app.vault.getMarkdownFiles()) {
                try {
                    const count = await this.normalizeFile(file)
                    if (count > 0) {
                        fileCount++
                        linkCount += count
                    }
                } catch (error) {
                    console.error(`Error normalizing ${file.path}:`, error)
                }
            }

            new Notice(`Normalized ${linkCount} wikilink(s) in ${fileCount} file(s)`)
        } finally {
            this.isNormalizing = false
        }
    }

    private async normalizeFile(file: TFile): Promise<number> {
        const cache = this.app.metadataCache.getFileCache(file)
        if (!cache?.links || cache.links.length === 0) return 0

        const content = await this.app.vault.cachedRead(file)
        const replacements = this.findLinkReplacements(cache, content, file.path)
        if (replacements.length === 0) return 0

        await this.app.vault.process(file, (content) => this.applyReplacements(content, replacements))

        return replacements.length
    }

    /** Apply replacements, which must be ordered from first to last */
    private applyReplacements(content: string, replacements: LinkReplacement[]): string {
        const pieces: string[] = []
        let cursor = 0

        for (const { start, end, replacement } of replacements) {
            pieces.push(content.slice(cursor, start), replacement)
            cursor = end
        }
        pieces.push(content.slice(cursor))

        return pieces.join("")
    }

    /** Compute the replacement for a single link, or null if it should be left alone */
    private computeReplacement(link: ParsedWikilink, sourcePath: string): string | null {
        // `subpath` is the "#heading" or "#^block" part, "" when there is none.
        const { path, subpath } = parseLinktext(link.target)

        // A link into the current file ([[#Heading]]) has no note part
        if (path === "") return null

        // getFirstLinkpathDest resolves case-insensitively
        const dest = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath)

        // Process link to nonexistent note
        if (dest === null) {
            // Add display text if the target note is missing and the first letter is lowercase
            const firstChar = path.charAt(0)
            if (
                !this.getSettings().onlyMatchExistingNotes &&
                link.display === null &&
                firstChar.toUpperCase() !== firstChar
            ) {
                return `[[${path}${subpath}|${path}${subpath}]]`
            }
            return null
        }

        // Links to attachments and other non-notes are out of scope
        if (dest.extension !== "md") return null

        // A link written with a folder keeps its folder, recased; a bare name stays bare
        const target = path.includes("/")
            ? dest.path.slice(0, -(dest.extension.length + 1))
            : dest.basename

        // Only a pure miscasing is rewritten
        if (target === path || target.toLowerCase() !== path.toLowerCase()) return null

        // Preserve what the link rendered as before: existing display text, or the path as written
        return `[[${target}${subpath}|${link.display ?? path + subpath}]]`
    }

    /**
     * Find all link replacements for a file, in ascending position order.
     *
     * `cache.links` is the only source of candidates, so anything Obsidian does not index as
     * a link – code blocks, code spans, frontmatter, embeds – is out of scope for free.
     */
    private findLinkReplacements(
        cache: CachedMetadata,
        content: string,
        sourcePath: string
    ): LinkReplacement[] {
        return (cache.links ?? [])
            .map((linkCache): LinkReplacement | null => {
                const start = linkCache.position.start.offset
                const end = linkCache.position.end.offset

                // The cache can lag the content and misplace the offsets. Therefore, the position 
                // is verified. A misplaced link is left for a later run.
                if (content.slice(start, end) !== linkCache.original) return null

                // Parsed from cached content rather than read off `.link`/`.displayText`
                const parsedLink = parseWikilink(linkCache.original)
                if (!parsedLink) return null

                const replacement = this.computeReplacement(parsedLink, sourcePath)
                return replacement ? { start, end, replacement } : null
            })
            .filter((r): r is LinkReplacement => r !== null)
            // ascending positions are required by consumers
            .sort((a, b) => a.start - b.start)
    }
}
