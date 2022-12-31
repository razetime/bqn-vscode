import * as vscode from "vscode";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  const bqk = Array.from(
    "\\`123456890-=~!@#$%^&*()_+qwertuiop[]QWERTIOP{}asdfghjkl;ASFGHKL:\"zxcvbm,./ZXVBM<>? '"
  );
  const bqv = Array.from(
    "\\˜˘¨⁼⌜´˝∞¯•÷×¬⎉⚇⍟◶⊘⎊⍎⍕⟨⟩√⋆⌽𝕨∊↑∧⊔⊏⊐π←→↙𝕎⍷𝕣⍋⊑⊒⍳⊣⊢⍉𝕤↕𝕗𝕘⊸∘○⟜⋄↖𝕊𝔽𝔾«⌾»·˙⥊𝕩↓∨⌊≡∾≍≠⋈𝕏⍒⌈≢≤≥⇐‿↩"
  );
  const map: { [key: string]: string } = {};
  for (const [i, key] of bqk.entries()) {
    map[key] = bqv[i];
  }

  let pending = false;
  const backslashCommand = vscode.commands.registerTextEditorCommand(
    "language-bqn.backslash",
    (editor, edit) => {
      const initialPositions = editor.selections.map((s) => s.active);
      for (const position of initialPositions) {
        edit.insert(position, "\\");
      }
      if (pending) {
        return;
      }
      pending = true;
      const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
        for (const change of event.contentChanges) {
          if (!onChange(change)) {
            pending = false;
            subscription.dispose();
            break;
          }
        }
      });
      let unseenBackslashes = initialPositions.length;
      const editsToMake: [vscode.Range, string][] = [];
      const onChange = (
        change: vscode.TextDocumentContentChangeEvent
      ): boolean => {
        if (unseenBackslashes > 0) {
          console.assert(change.text === "\\");
          unseenBackslashes--;
          return true;
        }
        const key = change.text;
        if (key.length !== 1) {
          return false;
        }
        const final = change.range.start;
        const initial = initialPositions.find((p) => {
          return p.line === final.line && p.character === final.character - 1;
        });
        if (initial == undefined) {
          return false;
        }
        const range = new vscode.Range(initial, final.translate(0, 1));
        const character = map[key];
        if (character == undefined) {
          return false;
        }
        editsToMake.push([range, character]);
        if (editsToMake.length !== initialPositions.length) {
          return true;
        }
        subscription.dispose();
        editor.edit((e) => {
          for (const [range, character] of editsToMake) {
            e.replace(range, character);
          }
        });
        return false;
      };
    }
  );
  context.subscriptions.push(backslashCommand);

  const commands = {
    "language-bqn.createTerminal": cmdCreateTerminal,
    "language-bqn.loadScript": cmdLoadScript,
    "language-bqn.clearImports": cmdClearImports,
    "language-bqn.clearImportsAndLoadScript": cmdClearImportsAndLoadScript,
    "language-bqn.profileScript": cmdProfileScript,
    "language-bqn.executeSelection": cmdExecuteSelection,
    "language-bqn.executeLine": cmdExecuteLine,
    "language-bqn.executeLineAdvance": cmdExecuteLineAdvance,
  };
  for (const [name, callback] of Object.entries(commands)) {
    vscode.commands.registerTextEditorCommand(name, callback);
  }
}

let terminal: vscode.Terminal;
let terminalCwd: string;

export function deactivate() {
  if (terminal != undefined) {
    terminal.dispose();
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfig() {
  return vscode.workspace.getConfiguration("bqn");
}

async function createOrShowTerminal(
  editor: vscode.TextEditor,
  options: { preserveFocus: boolean }
) {
  if (terminal != undefined && terminal.exitStatus == undefined) {
    terminal.show(options.preserveFocus);
    return;
  }
  const config = getConfig();
  terminalCwd = path.dirname(editor.document.fileName);
  terminal = vscode.window.createTerminal({
    name: "BQN",
    shellPath: config.executablePath,
    location: vscode.TerminalLocation.Panel,
    cwd: terminalCwd,
  });
  terminal.show(options.preserveFocus);
  await sleep(config.sendToNewReplDelay);
}

function cmdCreateTerminal(editor: vscode.TextEditor) {
  createOrShowTerminal(editor, { preserveFocus: false });
}

async function runCommands(
  editor: vscode.TextEditor,
  commands: (script: string) => string[]
): Promise<void> {
  const tasks = [];
  tasks.push(createOrShowTerminal(editor, { preserveFocus: true }));
  const needsScriptParam = commands.length > 0;
  if (needsScriptParam && getConfig().saveBeforeLoadScript) {
    tasks.push(editor.document.save());
  }
  await Promise.all(tasks);
  // Use a relative path to save space, and make it more obvious when the user
  // is loading a script from a different directory than the one they started
  // the REPL in (and hence imports won't work properly).
  const script = path.relative(terminalCwd, editor.document.fileName);
  for (const cmd of commands(script)) {
    terminal.sendText(cmd, true);
  }
}

function cmdClearImports(editor: vscode.TextEditor) {
  runCommands(editor, () => [")clearImportCache"]);
}

function cmdLoadScript(editor: vscode.TextEditor) {
  runCommands(editor, (script) => [`)ex ${script}`]);
}

function cmdClearImportsAndLoadScript(editor: vscode.TextEditor) {
  runCommands(editor, (script) => [")clearImportCache", `)ex ${script}`]);
}

function cmdProfileScript(editor: vscode.TextEditor) {
  runCommands(editor, (script) => [`)profile ⟨⟩ •Import "${script}"`]);
}

async function execute(editor: vscode.TextEditor, text: string) {
  await createOrShowTerminal(editor, { preserveFocus: true });
  // We surround the text with control characters "\x1b[200~" and "\x1b[201~" to
  // indicate bracketed paste mode to replxx. This makes it treat the code as a
  // whole, rather than trying to evaluate after each newline, which would fail
  // e.g. for a line ending in "{" that starts a block.
  //
  // TODO: Once the extension API adds the third parameter `bracketedPasteMode`,
  // pass true for that instead of doing this manually. For more details:
  // https://github.com/microsoft/vscode/issues/153592#issuecomment-1182045382
  // https://github.com/microsoft/vscode/commit/65f97ed1d96989e64c57a689dae062579c75d5f3
  // https://github.com/microsoft/vscode/commit/89c00c59b6215802b8c02d9b0407f2a8340aed23
  if (getConfig().executableSupportsReplxx) {
    text = `\x1b[200~${text}\x1b[201~`;
  }
  terminal.sendText(text, true);
}

function cmdExecuteSelection(editor: vscode.TextEditor) {
  execute(editor, editor.document.getText(editor.selection));
}

function cmdExecuteLine(editor: vscode.TextEditor) {
  execute(editor, editor.document.lineAt(editor.selection.active.line).text);
}

function cmdExecuteLineAdvance(editor: vscode.TextEditor) {
  cmdExecuteLine(editor);
  const line = editor.selection.active.line;
  let n = 1;
  while (
    line + n < editor.document.lineCount - 1 &&
    /^\s*(#.*)?$/.test(editor.document.lineAt(line + n).text)
  ) {
    n++;
  }
  vscode.commands.executeCommand("cursorMove", {
    to: "down",
    by: "line",
    value: n,
  });
}
