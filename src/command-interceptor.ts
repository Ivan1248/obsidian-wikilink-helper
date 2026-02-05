import { App, Command, Component } from 'obsidian'

export class CommandInterceptor extends Component {
    private app: App
    private command: string
    private onCommand: () => void
    private originalCheckCallback: ((checking: boolean) => boolean | void) | undefined

    constructor(app: App, command: string, onCommand: () => void) {
        super()
        this.app = app
        this.command = command
        this.onCommand = onCommand
    }

    onload() {
        // Source: https://github.com/hipstersmoothie/obsidian-plugin-prettier/blob/main/src/main.ts
        const cmd = (this.app as any).commands?.commands?.[this.command] as Command
        if (!cmd) return
        this.originalCheckCallback = cmd.checkCallback
        if (!this.originalCheckCallback) return

        cmd.checkCallback = (checking: boolean) => {
            const originalResult = this.originalCheckCallback?.(checking)
            if (checking) {
                return originalResult
            } else {
                this.onCommand()
            }
        }
    }

    onunload() {
        if (this.originalCheckCallback) {
            const cmd = (this.app as any).commands?.commands?.[this.command] as Command
            if (cmd) {
                cmd.checkCallback = this.originalCheckCallback
            }
        }
    }
}
