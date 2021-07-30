"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode_1 = __importDefault(require("vscode"));
let terminal;
function activate(context) {
    const cmds = [
        ['language-bqn.createTerminal', createTerminal],
        ['language-bqn.loadScript', loadScript],
        ['language-bqn.executeSelection', executeSelection],
        ['language-bqn.executeLine', executeLine],
        ['language-bqn.executeLineAdvance', executeLineAdvance]
    ];
    for (const [n, f] of cmds) {
        vscode_1.default.commands.registerTextEditorCommand(n, f);
    }
}
exports.activate = activate;
function deactivate(context) {
    if (terminal) {
        terminal.dispose();
    }
}
exports.deactivate = deactivate;
function createTerminal() {
    if (terminal == null) {
        const config = vscode_1.default.workspace.getConfiguration('bqn');
        terminal = vscode_1.default.window.createTerminal("BQN", config.executablePath);
        terminal.show();
    }
}
function loadScript(t, e) {
    createTerminal();
    const name = t.document.fileName;
    terminal.sendText(`)ex ${name}`);
}
function executeSelection(t, e) { }
function executeLine(t, e) {
    createTerminal();
    let line = t.document.lineAt(t.selection.active.line).text;
    terminal.sendText(line, !line.endsWith('\n'));
}
function executeLineAdvance(t, e) {
    executeLine(t, e);
    vscode_1.default.commands.executeCommand('cursorMove', { to: "down", by: "wrappedLine" });
}
