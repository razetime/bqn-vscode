import vscode from 'vscode';

type Cmd = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void

let terminal: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
    const cmds: [string, Cmd][] = [
        ['language-bqn.createTerminal', createTerminal],
        ['language-bqn.loadScript', loadScript],
        ['language-bqn.executeSelection', executeSelection],
        ['language-bqn.executeLine', executeLine],
        ['language-bqn.executeLineAdvance', executeLineAdvance]
    ];
    for(const [n, f] of cmds) { vscode.commands.registerTextEditorCommand(n, f) }
}

export function deactivate(context: vscode.ExtensionContext) {
    if (terminal) { terminal.dispose() }
}

function createTerminal() {
    if (terminal == null) {
        const config = vscode.workspace.getConfiguration('bqn');

        terminal = vscode.window.createTerminal("BQN", config.executablePath);
        terminal.show();
    }
}

function loadScript(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    createTerminal()

    const name = t.document.fileName
    terminal.sendText(`)ex ${name}`)
}
function executeSelection(t: vscode.TextEditor, e: vscode.TextEditorEdit) {}
function executeLine(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    createTerminal()

    let line = t.document.lineAt(t.selection.active.line).text
    terminal.sendText(line, !line.endsWith('\n'))
}
function executeLineAdvance(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    executeLine(t, e)
    vscode.commands.executeCommand('cursorMove', { to: "down", by: "wrappedLine"})
}
