# BQN VS Code plugin

Current features:
- backslash symbol completion (`\r` -> `↑`)
- File, line and selection execution in terminal from @suhr
  To access this, you need to add `"bqn.executablePath": "<full filepath>",` to your `settings.json` file. (Ctrl-Shift-P ->  "Open Settings") 
- Syntax highlight support 
- Symbol name and data available with `Ctrl+space`

TODO:
- Multline string highlighting
- Block context highlighting
- inline code execution similar to [nvim-bqn](https://git.sr.ht/~detegr/nvim-bqn) 
