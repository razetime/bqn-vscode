# BQN VS Code plugin

This VS Code extension provides language support for [BQN].

It is available on the [Open VSX Registry] and the [VS Code Marketplace].

## Features

### Current

- Syntax highlighting.
- Backslash symbol completion (`\r` -> `↑`) using the [standard BQN keymap], like in the [online REPL].
- File, line, and selection execution in the integrated terminal (from @suhr). This requires having a `bqn` executable in your PATH, or customizing the `bqn.executablePath` setting.

### Planned

- Block context highlighting for symbols like `𝕨` and `𝕣`.
- Inline code execution similar to [nvim-bqn].
- CBQN WASM interpreter bundled with the extension.

[BQN]: https://mlochbaum.github.io/BQN/
[Open VSX Registry]: https://open-vsx.org/extension/razetime/bqn-language
[VS Code Marketplace]: https://marketplace.visualstudio.com/items?itemName=razetime.bqn-language
[Standard BQN keymap]: https://mlochbaum.github.io/BQN/keymap.html
[online REPL]: https://mlochbaum.github.io/BQN/try.html
[nvim-bqn]: https://git.sr.ht/~detegr/nvim-bqn
