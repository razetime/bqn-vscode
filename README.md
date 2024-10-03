# BQN VS Code plugin

**Development of this extension has moved to [mk12/bqn-vscode](https://github.com/mk12/bqn-vscode). See [#32](https://github.com/razetime/bqn-vscode/issues/32) for details.**

This VS Code extension provides language support for [BQN].

It is available on the [Open VSX Registry] and the [VS Code Marketplace].

## Setup
This extension has a focus on the [CBQN] implementation. The `REPLXX=1` option
must be enabled during building for best results.

### Configurable Settings
You can add these settings to your settings.json file to disable some of the default behaviours of this extension.
- `bqn.executablePath` - Path to the CBQN executable e.g.
  `/home/username/CBQN/BQN`.
- `bqn.saveBeforeLoadScript` - Whether vscode should save the script before
   loading it into the CBQN REPL.
- `bqn.sendToNewReplDelay` - How long vscode should wait before sending text to
   a repl.
- `bqn.executableSupportsReplxx` - Marks whether the executable set in
   `bqn.executablePath` is built with replxx support.
- `bqn.pendingBackslashBackgroundColor` - Style customization feature for
   backslash completion.
- `bqn.enableBackslashCompletion` - `true` by default. If you have an extension 
   that interferes with backslash completion (e.g. Vim keybindings), please set
   this to false and use a
   [system-wide method.](https://mlochbaum.github.io/BQN/editors/#system-wide)
- `bqn.enableHoverDocumentation` - Controls whether documentation will be
   displayed for a symbol on mouseover.

## Features

### Current

- Syntax highlighting.
- Backslash symbol completion (`\r` -> `↑`) using the [standard BQN keymap],
  like in the [online REPL].
- Symbol completion by function name (`take<tab>` -> `↑`).
- Help popups when hovering over glyphs.
- File, line, and selection execution in the integrated terminal (from @suhr and @mk12). This requires having a `bqn` executable in your PATH, or customizing the `bqn.executablePath` setting.

### Planned

- Block context highlighting for symbols like `𝕨` and `𝕣`.
- Inline code execution similar to [nvim-bqn].
- CBQN WASM interpreter bundled with the extension.
- Add a symbol table to the sidebar for clickable BQN symbols.

[BQN]: https://mlochbaum.github.io/BQN/
[CBQN]: https://github.com/dzaima/CBQN
[Open VSX Registry]: https://open-vsx.org/extension/mk12/bqn
[VS Code Marketplace]: https://marketplace.visualstudio.com/items?itemName=mk12.bqn
[Standard BQN keymap]: https://mlochbaum.github.io/BQN/keymap.html
[online REPL]: https://mlochbaum.github.io/BQN/try.html
[nvim-bqn]: https://git.sr.ht/~detegr/nvim-bqn
