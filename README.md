# Wikilink Helper

A plugin for Obsidian that can automatically insert wikilink display text or normalize existing wikilinks.

## Features

- **Automatic display text insertion**: Triggered by typing `|` at the end of a wikilink. Optionally, the first character can be lowercased.
    - Example: If the target file name is `Note.md`, `[[Note|]]` (`|` just typed) → `[[Note|note]]`
- **Wikilink normalization**: Triggered via commands or by pressing `Ctrl`+`S`.
    - Examples: 
        - `[[note]]` → `[[Note|note]]`
        - `[[note|note]]` → `[[Note|note]]`
        - `[[Note]]` → `[[Note]]` (no change)

## Use cases

- **Preserving lowercase display text**: If you use a link like `[[note]]` to a file named `Note.md`, but then rename the file to `Article.md`, Obsidian will update `[[note]]` to `[[Article]]`, but you would prefer `[[Article|note]]`. By using `[[Note|note]]`,the display text remains `note`.
- **Compatibility with external tools**: While Obsidian is case-insensitive for links, many static site generators (like Quartz or Hugo) are case-sensitive. Wikilink normalization ensures that links match the actual file name casing, preventing broken links in external publishing workflows.

## Installation

### Via BRAT

1.  Install the [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2.  Open BRAT settings and click *Add beta plugin*.
3.  Enter the repository URL of this repository.
4.  Click *Add Plugin*.

### Manual installation

1.  Download the latest release from the releases page.
2.  Extract the `main.js`, `manifest.json`, and `styles.css` (if present) into `<your-vault>/.obsidian/plugins/wikilink-helper/`.
3.  Restart Obsidian or reload the plugin in *Settings* > *Community plugins*.
