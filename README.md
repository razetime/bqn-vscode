# BQN VS Code plugin

This VS Code extension provides language support for [BQN].

It is available on the [Open VSX Registry] and the [VS Code Marketplace].

## Setup
This extension has a focus on the [CBQN] implementation. The `REPLXX=1` option must be enabled during building for best results.

### Configurable Settings
You can add these settings to your settings.json file to disable some of the default behaviours of this extension.
- `bqn.executablePath` - Path to the CBQN executable e.g. `/home/username/CBQN/BQN`.
- `bqn.saveBeforeLoadScript` - Whether vscode should save the script before loading it into the CBQN REPL.
- `bqn.sendToNewReplDelay` - How long vscode should wait beforesending text to a repl.
- `bqn.executableSupportsReplxx` - Marks whether the executable has replxx support. It is recommended to have a replxx build.
- `bqn.pendingBackslashBackgroundColor` - Style customization feature for backslash completion.
- `bqn.enableHoverDocumentation` - Controls whether documentation will be displayed for a symbol on mouseover.

## Features

### Current

- Syntax highlighting.
- Backslash symbol completion (`\r` -> `↑`) using the [standard BQN keymap], like in the [online REPL].
- Help popups when hovering over glyphs.
- File, line, and selection execution in the integrated terminal (from @suhr and @mk12). This requires having a `bqn` executable in your PATH, or customizing the `bqn.executablePath` setting.

### Planned

- Block context highlighting for symbols like `𝕨` and `𝕣`.
- Inline code execution similar to [nvim-bqn].
- CBQN WASM interpreter bundled with the extension.
- Add a symbol table to the sidebar for clickable BQN symbols.

[BQN]: https://mlochbaum.github.io/BQN/
[CBQN]: https://github.com/dzaima/CBQN
[Open VSX Registry]: https://open-vsx.org/extension/razetime/bqn-language
[VS Code Marketplace]: https://marketplace.visualstudio.com/items?itemName=razetime.bqn-language
[Standard BQN keymap]: https://mlochbaum.github.io/BQN/keymap.html
[online REPL]: https://mlochbaum.github.io/BQN/try.html
[nvim-bqn]: https://git.sr.ht/~detegr/nvim-bqn
