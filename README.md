# BQN VS Code plugin

Available for install from the [Open VSX Registry](https://open-vsx.org/extension/razetime/bqn-language) and [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=razetime.bqn-language).

Current features:
- backslash symbol completion (`\r` -> `↑`) that uses the [Standard BQN keymap](https://mlochbaum.github.io/BQN/keymap.html)
- File, line and selection execution in terminal from @suhr
  To access this, you need to add `"bqn.executablePath": "<full filepath>",` to your `settings.json` file. (Ctrl-Shift-P ->  "Open Settings") 
- Syntax highlight support 
- Symbol name and data available with `Ctrl+space`

TODO:
- Multline string highlighting
- Block context highlighting
- inline code execution similar to [nvim-bqn](https://git.sr.ht/~detegr/nvim-bqn) 
