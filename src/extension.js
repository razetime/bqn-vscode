"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode_1 = __importDefault(require("vscode"));
// Keyboard symbols.
let terminal;
function activate(context) {
    // BQN keymap
    const bqk = Array.from('`123456890-=~!@#$%^&*()_+qwertuiop[]QWERTIOP{}asdfghjkl;ASFGHKL:"zxcvbm,./ZXVBM<>? \'');
    const bqv = Array.from('˜˘¨⁼⌜´˝∞¯•÷×¬⎉⚇⍟◶⊘⎊⍎⍕⟨⟩√⋆⌽𝕨∊↑∧⊔⊏⊐π←→↙𝕎⍷𝕣⍋⊑⊒⍳⊣⊢⍉𝕤↕𝕗𝕘⊸∘○⟜⋄↖𝕊𝔽𝔾«⌾»·˙⥊𝕩↓∨⌊≡∾≍≠⋈𝕏⍒⌈≢≤≥⇐‿↩');
    let key_map = {};
    for (let i = 0; i < bqk.length; i++) {
        key_map[bqk[i]] = bqv[i];
    }
    // taken and lightly changed from prollings/apl_backtick_symbols
    let pending = false;
    const command = vscode_1.default.commands.registerTextEditorCommand("language-bqn.backslash", (te, e) => {
        vscode_1.default.window.showInformationMessage("Backslash pressed");
        e.insert(te.selection.active, "\\");
        if (pending) {
            return 0;
        }
        pending = true;
        let active_pos = te.selection.active;
        let sub1 = vscode_1.default.workspace.onDidChangeTextDocument(_ => {
            sub1.dispose();
            let sub2 = vscode_1.default.workspace.onDidChangeTextDocument(ev => {
                sub2.dispose();
                let this_pos = ev.contentChanges[0].range.start;
                if (this_pos.line === active_pos.line
                    && (this_pos.character - active_pos.character) === 1
                    && ev.contentChanges[0].text.length === 1) {
                    let replace_range = new vscode_1.default.Range(active_pos, this_pos.translate(0, 1));
                    let key = ev.contentChanges[0].text;
                    if (key in key_map) {
                        let symbol = key_map[key];
                        te.edit((e) => e.replace(replace_range, symbol)).then();
                    }
                }
                pending = false;
            });
        });
    });
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
    context.subscriptions.push(command);
}
exports.activate = activate;
function deactivate(context) {
    if (terminal != null) {
        terminal.dispose();
    }
}
exports.deactivate = deactivate;
function createTerminal() {
    if (terminal == null || terminal.exitStatus != undefined) {
        const config = vscode_1.default.workspace.getConfiguration('bqn');
        terminal = vscode_1.default.window.createTerminal("BQN", config.executablePath);
        terminal.show();
    }
}
function loadScript(t, e) {
    createTerminal();
    terminal.sendText(`)ex ${t.document.fileName}`);
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
