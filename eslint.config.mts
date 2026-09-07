import obsidianmd from 'eslint-plugin-obsidianmd'
import globals from 'globals'
import { globalIgnores, defineConfig } from 'eslint/config'

export default defineConfig(
    globalIgnores([
        'node_modules',
        'dist',
        'esbuild.config.mjs',
        'version-bump.mjs',
        'versions.json',
        'main.js',
        'package-lock.json',
        'tsconfig.json',
    ]),
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                projectService: {
                    // eslint.config.mts is not listed here: tsconfig.json includes it, so it
                    // has a real project and listing it again is an error
                    allowDefaultProject: ['manifest.json'],
                },
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.json'],
            },
        },
    },
    ...obsidianmd.configs.recommended,
    {
        files: ['**/*.{ts,cts,mts,tsx}'],
        // Beyond the sample plugin: catch mishandled promises, which this plugin has
        // several of (vault scans, vault.process, loadData)
        rules: {
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
        },
    },
)
