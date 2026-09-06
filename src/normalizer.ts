import { App, MarkdownView, Notice, CachedMetadata, Loc, TFile } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'

interface LinkReplacement {
    start: Loc
    end: Loc
    replacement: string
}

export class WikilinkNormalizer {
    private app: App
    private settings: AutoWikilinkDisplayTextSettings
    private isNormalizing = false
    private filenameMapCache: Map<string, string> | null = null

    constructor(app: App, settings: AutoWikilinkDisplayTextSettings) {
        this.app = app
        this.settings = settings
    }

    /** Normalize current file using editor */
    public normalizeCurrentFile(): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!view?.file) {
            return
        }

        const file = view.file
        const editor = view.editor
        const cache = this.app.metadataCache.getFileCache(file)

        if (!cache?.links || cache.links.length === 0) {
            return
        }

        try {
            const replacements = this.findLinkReplacements(cache, editor.getValue(), this.getFilenameMap())

            // Apply replacements in reverse order to maintain positions
            for (const { start, end, replacement } of replacements) {
                editor.replaceRange(
                    replacement,
                    { line: start.line, ch: start.col },
                    { line: end.line, ch: end.col }
                )
            }

            if (replacements.length > 0) {
                new Notice(`Normalized ${replacements.length} wikilink(s)`)
            }
        } catch (error) {
            console.error("Error normalizing current file:", error)
            new Notice("Error normalizing file")
        }
    }

    /** Normalize entire vault */
    public async normalizeAllFiles(): Promise<void> {
        if (this.isNormalizing) {
            return
        }

        this.isNormalizing = true
        try {
            const filenameMap = this.getFilenameMap()
            let fileCount = 0
            let linkCount = 0

            const files = this.app.vault.getMarkdownFiles()

            for (const file of files) {
                try {
                    const count = await this.normalizeFile(file, filenameMap)
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

    /** Normalize a single file */
    private async normalizeFile(
        file: TFile,
        filenameMap: Map<string, string>
    ): Promise<number> {
        const cache = this.app.metadataCache.getFileCache(file)
        if (!cache?.links || cache.links.length === 0) return 0

        // Check first so that files needing no change are not rewritten
        const replacements = this.findLinkReplacements(
            cache,
            await this.app.vault.cachedRead(file),
            filenameMap
        )
        if (replacements.length === 0) return 0

        await this.app.vault.process(file, (content) => this.applyReplacements(content, replacements))

        return replacements.length
    }

    /** Apply replacements, which must be ordered from last to first */
    private applyReplacements(content: string, replacements: LinkReplacement[]): string {
        const pieces: string[] = []
        let tail = content.length

        for (const { start, end, replacement } of replacements) {
            pieces.push(content.slice(end.offset, tail), replacement)
            tail = start.offset
        }
        pieces.push(content.slice(0, tail))

        return pieces.reverse().join("")
    }

    /** Build or retrieve cached filename map */
    private getFilenameMap(): Map<string, string> {
        if (!this.filenameMapCache) {
            this.filenameMapCache = this.buildFilenameMap()
        }
        return this.filenameMapCache
    }

    /** Invalidate filename cache (call when files are created/renamed) */
    public invalidateCache(): void {
        this.filenameMapCache = null
    }

    /** Build map: lowercase filename -> real filename */
    private buildFilenameMap(): Map<string, string> {
        const map = new Map<string, string>()
        for (const file of this.app.vault.getMarkdownFiles()) {
            map.set(file.basename.toLowerCase(), file.basename)
        }
        return map
    }

    /** Compute replacement for a single link, or null if no change needed */
    private computeReplacement(
        target: string,
        existing: string,
        filenameMap: Map<string, string>
    ): string | null {
        // Validate wikilink format
        if (!existing.startsWith("[[") || !existing.endsWith("]]")) {
            return null
        }

        const inner = existing.slice(2, -2)
        const pipeIndex = inner.indexOf("|")
        const existingDisplay = pipeIndex !== -1 ? inner.slice(pipeIndex + 1) : null

        const realName = filenameMap.get(target.toLowerCase())

        if (!realName) {
            // Add display text if the target note is missing and the first letter is lowercase
            const firstChar = target.charAt(0)
            if (!this.settings.onlyMatchExistingNotes && !existingDisplay && firstChar.toUpperCase() !== firstChar) {
                return `[[${target}|${target}]]`
            }
            return null
        }

        // File exists - check if update needed
        const targetMatches = realName === target
        if (targetMatches) {
            return null // Already correct casing, and we don't force display text if missing (e.g. [[Property]])
        }

        // Casing mismatch (target vs realName) or missing display text for non-matching target
        // Use existing display text or original target as display
        const displayText = existingDisplay ?? target
        return `[[${realName}|${displayText}]]`
    }

    /** Find all link replacements for a file's cache */
    private findLinkReplacements(
        cache: CachedMetadata,
        content: string,
        filenameMap: Map<string, string>
    ): LinkReplacement[] {
        if (!cache.links) return []

        const replacements: LinkReplacement[] = []

        // Process from bottom to top so positions stay valid
        const links = [...cache.links].reverse()

        for (const link of links) {
            if (!link.link) continue

            const { start, end } = link.position
            const existing = content.slice(start.offset, end.offset)
            const replacement = this.computeReplacement(link.link, existing, filenameMap)

            if (replacement) {
                replacements.push({ start, end, replacement })
            }
        }

        return replacements
    }
}

