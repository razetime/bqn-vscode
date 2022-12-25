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
      edit.insert(editor.selection.active, "\\");
      if (pending) {
        return;
      }
      pending = true;
      const p1 = editor.selection.active;
      let sawBackslash = false;
      const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
        event.contentChanges.forEach(onChange);
      });
      const onChange = (change: vscode.TextDocumentContentChangeEvent) => {
        if (!sawBackslash) {
          console.assert(change.text === "\\");
          sawBackslash = true;
          return;
        }
        subscription.dispose();
        pending = false;
        const p2 = change.range.start;
        const key = change.text;
        const expected =
          p2.line === p1.line &&
          p2.character === p1.character + 1 &&
          key.length === 1;
        if (!expected) {
          return;
        }
        const range = new vscode.Range(p1, p2.translate(0, 1));
        const character = map[key];
        if (character == undefined) {
          return;
        }
        editor.edit((e) => e.replace(range, character));
      };
    }
  );
  context.subscriptions.push(backslashCommand);

  const commands = {
    "language-bqn.createTerminal": createTerminal,
    "language-bqn.loadScript": loadScript,
    "language-bqn.clearImportsAndLoadScript": clearImportsAndLoadScript,
    "language-bqn.executeSelection": executeSelection,
    "language-bqn.executeLine": executeLine,
    "language-bqn.executeLineAdvance": executeLineAdvance,
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

type Focus = "terminal" | "editor";

function showTerminal(focus: Focus) {
  const preserveFocus = focus === "editor";
  terminal.show(preserveFocus);
}

async function createOrShowTerminal(editor: vscode.TextEditor, focus: Focus) {
  if (terminal != undefined && terminal.exitStatus == undefined) {
    showTerminal(focus);
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
  showTerminal(focus);
  await sleep(config.sendToNewReplDelay);
}

function createTerminal(editor: vscode.TextEditor) {
  createOrShowTerminal(editor, "terminal");
}

async function loadScript(editor: vscode.TextEditor): Promise<void> {
  const config = getConfig();
  const tasks = [];
  tasks.push(createOrShowTerminal(editor, "editor"));
  if (config.saveBeforeLoadScript) {
    tasks.push(editor.document.save());
  }
  await Promise.all(tasks);
  // Use a relative path to save space, and make it more obvious when the user
  // is loading a script from a different directory than the one they started
  // the REPL in (and hence imports won't work properly).
  const script = path.relative(terminalCwd, editor.document.fileName);
  terminal.sendText(`)ex ${script}`, false);
  await sleep(config.sendLoadScriptNewlineDelay);
  terminal.sendText("\n", false);
}

async function execute(editor: vscode.TextEditor, code: string) {
  await createOrShowTerminal(editor, "editor");
  terminal.sendText(code, !code.endsWith("\n"));
}

async function clearImportsAndLoadScript(editor: vscode.TextEditor) {
  await execute(editor, ")clearImportCache");
  await loadScript(editor);
}

function executeSelection(editor: vscode.TextEditor) {
  if (editor.selection.isEmpty) {
    return;
  }
  // Strip out comments to avoid "Error: Empty program" cluttering the REPL.
  const code = editor.document
    .getText(editor.selection)
    .replace(/#[^\r\n]*/g, "")
    .replace(/(\r?\n){3,}/g, "$1$1");
  execute(editor, code);
}

function executeLine(editor: vscode.TextEditor) {
  execute(editor, editor.document.lineAt(editor.selection.active.line).text);
}

function executeLineAdvance(editor: vscode.TextEditor) {
  executeLine(editor);
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
