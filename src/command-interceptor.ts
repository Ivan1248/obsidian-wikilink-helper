import { App, Command, Component } from 'obsidian'

/** Internal Obsidian API for command management (not part of public API) */
interface AppWithCommands extends App {
    commands?: { commands?: Record<string, Command> }
}

function getCommand(app: App, command: string): Command | undefined {
    return (app as AppWithCommands).commands?.commands?.[command]
}


export class CommandInterceptor extends Component {
    private app: App
    private command: string
    private onCommand: () => void
    /** Undoes whatever `patchCommand` installed, if it succeeded */
    private restore: (() => void) | undefined
    private unloaded = false

    constructor(app: App, command: string, onCommand: () => void) {
        super()
        this.app = app
        this.command = command
        this.onCommand = onCommand
    }

    onload() {
        // Core commands may not be registered yet while plugins are loading
        this.app.workspace.onLayoutReady(() => this.patchCommand())
    }

    /**
     * Wrap the command so that `onCommand` runs after it. Which property a given command
     * populates isn't stable across Obsidian versions (obsidian-plugin-prettier, linked below,
     * used `callback` for this same command id; this codebase found `checkCallback`), so both
     * are handled.
     *
     * Patch technique from: https://github.com/hipstersmoothie/obsidian-plugin-prettier/blob/main/src/main.ts
     */
    private patchCommand() {
        // An `onLayoutReady` callback cannot be cancelled, so unloading before layout-ready
        // would otherwise patch the command with nothing left to restore it
        if (this.unloaded) return

        const cmd = getCommand(this.app, this.command)
        if (!cmd) {
            console.warn(`Wikilink Helper: command "${this.command}" not found, cannot intercept it`)
            return
        }

        if (cmd.checkCallback) {
            const original = cmd.checkCallback
            this.restore = () => { cmd.checkCallback = original }
            cmd.checkCallback = (checking: boolean) => {
                const originalResult = original(checking)
                if (checking) {
                    return originalResult
                } else {
                    this.onCommand()
                }
            }
        } else if (cmd.callback) {
            const original = cmd.callback
            this.restore = () => { cmd.callback = original }
            cmd.callback = () => {
                original()
                this.onCommand()
            }
        } else {
            console.warn(`Wikilink Helper: command "${this.command}" has no callback to intercept`)
        }
    }

    onunload() {
        this.unloaded = true
        this.restore?.()
    }

}
