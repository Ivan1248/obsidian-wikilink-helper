import { App, MarkdownView, Notice, CachedMetadata, TFile } from 'obsidian'
import { AutoWikilinkDisplayTextSettings } from './types'

export interface LinkReplacement {
    from: { line: number; ch: number }
    to: { line: number; ch: number }
    replacement: string
}

interface Position {
    line: number
    col: number
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
            const filenameMap = this.getFilenameMap()
            const replacements = this.findLinkReplacements(
                cache,
                (start, end) => editor.getRange(
                    { line: start.line, ch: start.col },
                    { line: end.line, ch: end.col }
                ),
                filenameMap
            )

            // Apply replacements in reverse order to maintain positions
            for (const { from, to, replacement } of replacements) {
                editor.replaceRange(replacement, from, to)
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

        const content = await this.app.vault.read(file)
        const replacements = this.findLinkReplacements(
            cache,
            (start, end) => this.extractText(content, start, end),
            filenameMap
        )

        if (replacements.length === 0) return 0

        // Apply replacements from end to start to maintain positions
        let modifiedContent = content
        for (const { from, to, replacement } of replacements) {
            const offset = this.positionToOffset(content, from)
            const endOffset = this.positionToOffset(content, to)

            if (offset !== -1 && endOffset !== -1) {
                modifiedContent =
                    modifiedContent.slice(0, offset) +
                    replacement +
                    modifiedContent.slice(endOffset)
            }
        }

        await this.app.vault.modify(file, modifiedContent)
        return replacements.length
    }

    /** Convert line/col position to string offset */
    private positionToOffset(text: string, pos: { line: number; ch: number }): number {
        const lines = text.split('\n')
        if (pos.line >= lines.length) return -1

        let offset = 0
        for (let i = 0; i < pos.line; i++) {
            offset += (lines[i]?.length ?? 0) + 1 // +1 for newline
        }
        offset += pos.ch

        return offset <= text.length ? offset : -1
    }

    /** Extract text between positions */
    private extractText(content: string, start: Position, end: Position): string {
        const lines = content.split('\n')

        if (start.line === end.line) {
            return lines[start.line]?.slice(start.col, end.col) ?? ""
        }

        let text = lines[start.line]?.slice(start.col) ?? ""
        for (let i = start.line + 1; i < end.line; i++) {
            text += '\n' + (lines[i] ?? "")
        }
        text += '\n' + (lines[end.line]?.slice(0, end.col) ?? "")

        return text
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
            if (!this.settings.onlyMatchExistingNotes && !existingDisplay && target.at(0)?.toUpperCase() !== target.at(0)) {
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
        getText: (start: Position, end: Position) => string,
        filenameMap: Map<string, string>
    ): LinkReplacement[] {
        if (!cache.links) return []

        const replacements: LinkReplacement[] = []

        // Process from bottom to top so positions stay valid
        const links = [...cache.links].reverse()

        for (const link of links) {
            const { start, end } = link.position
            const existing = getText(start, end)

            if (!link.link) continue

            const replacement = this.computeReplacement(link.link, existing, filenameMap)

            if (replacement) {
                replacements.push({
                    from: { line: start.line, ch: start.col },
                    to: { line: end.line, ch: end.col },
                    replacement
                })
            }
        }

        return replacements
    }
}

