# Change Log

All notable changes to the "bqn-language" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]
- Block context highlighting for symbols like `𝕨` and `𝕣`
- inline code execution similar to [nvim-bqn](https://git.sr.ht/~detegr/nvim-bqn)
- CBQN WASM interpreter bundled with the extension

## Released
- v0.1.3
  - Add Latin1 variable support
  - Correct TextMate classes for highlighting
  - Fix double-struck characters not being highlighted
- v0.1.2
  - fix syntax highlighting problem with strands (`‿`)
- v0.1.1 (changes by @mk12)
  - Use bracketed paste mode
  - "Clear Imports" and "Profile Script" commands
  - Support multiple cursors
  - Highlight pending backslash
  - Documentation for symbols on hover
- v0.1.0 (changes by @mk12)
  * **Implement "Execute Selection"**.
  * **Rewrite the backslash command** to be more reliable.
  * **Create the REPL in the terminal panel**, not in an editor (which was annoying because it covered the current editor).
  * When executing code requires creating a new REPL, **delay for 500ms** (customizable) to wait for BQN to be ready, otherwise input gets messed up in my experience. Also delay 50ms before sending the newline after an `)ex` command for similar reasons.
  * **Start the REPL in the current file's directory**, rather than the project directory (default), so that imports work correctly.
  * For execution commands, **keep focus in the editor**, but for the "Create BQN REPL" command, focus the terminal.
  * When advancing to the next line, **skip over blank lines and comments**.
  * Use title case for "BQN: Convert To Symbol".
  * Remove unused codeLensProvider capability.
  * Remove semantic highlighting, which didn't work and was causing errors in the logs (seems to have been copied from some sample code).
  * Remove `// #region` folding support which doens't make sense in BQN.
  * Remove some characters from autoCloseBefore which looked like they didn't belong (based on the docs, "typically the set of characters which can not start an expression").
  * **Use Ctrl+Enter for both "Execute Line and Advance" and "Execute Selection"**, based on whether text is selected or not. There is no need for separate shortcuts (also, Ctrl+E which was used before conflicts with the default shortcut for jumping to the end of the line, which I use heavily since it's supported everywhere in macOS).
  * Remove the "cbqn" default, since "bqn.executablePath" already is already defaulted to "bqn" later in package.json.
  * Remove the "terminal.integrated.enablePersistentSessions" setting.
- v0.0.4
  - Multiline string support
  - Transient terminal
- Initial release
  - basic highlighting
