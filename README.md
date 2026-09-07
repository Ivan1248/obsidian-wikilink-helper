# Wikilink Helper

A plugin for Obsidian that can automatically insert wikilink display text or normalize existing wikilinks.

## Requirements

- Obsidian v1.13.0+

## Features

- **Automatic display text insertion**: Triggered by typing `|` at the end of a wikilink. Optionally, the first character can be lowercased.
    - Example: If the target file name is `Note.md`, `[[Note|]]` (`|` just typed) → `[[Note|note]]`
- **Wikilink normalization**: Triggered via commands, or by the save command (`Ctrl`+`S`).
    - Examples:
        - `[[note]]` → `[[Note|note]]`
        - `[[note|note]]` → `[[Note|note]]`
        - `[[folder/note]]` → `[[Folder/Note|folder/note]]`
        - `[[Note]]` → `[[Note]]` (no change)
    - Optionally, display text is also added to lowercase links whose target doesn't exist yet: `[[idea]]` → `[[idea|idea]]`

## Use cases

- **Preserving lowercase display text**: If you use a link like `[[note]]` to a file named `Note.md`, but then rename the file to `Article.md`, Obsidian will update `[[note]]` to `[[Article]]`, but you would prefer `[[Article|note]]`. By using `[[Note|note]]`, the display text remains `note`.
- **Compatibility with external tools**: While Obsidian is case-insensitive for links, many static site generators (like Quartz or Hugo) are case-sensitive. Wikilink normalization ensures that links match the actual file and folder name casing, preventing broken links in external publishing workflows.

## Installation

### Community plugins (recommended)

Install via *Settings* → *Community plugins* in Obsidian.

### Via BRAT

1.  Install the [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2.  Open BRAT settings and click *Add beta plugin*.
3.  Enter the repository URL of this repository.
4.  Click *Add Plugin*.

### Manual installation

1.  Download the latest release from the releases page.
2.  Extract `main.js` and `manifest.json` into `<your-vault>/.obsidian/plugins/wikilink-helper/`.
3.  Restart Obsidian or reload the plugin in *Settings* → *Community plugins*.

## Development

```bash
npm install        # install dependencies
npm run dev        # build in watch mode (for development)
npm run build      # type-check and build for production
npm run lint       # run ESLint
```

## Other information

- [Disclosures](https://docs.obsidian.md/Developer+policies#Disclosures) per Obsidian developer policies: none. The plugin doesn't use the network, doesn't collect any data, and doesn't access files outside of the vault.
