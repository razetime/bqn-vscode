"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode_1 = __importDefault(require("vscode"));
let terminal;
function activate(context) {
    const bqk = Array.from('`123456890-=~!@#$%^&*()_+qwertuiop[]QWERTIOP{}asdfghjkl;ASFGHKL:"zxcvbm,./ZXVBM<>? \'');
    const bqv = Array.from('˜˘¨⁼⌜´˝∞¯•÷×¬⎉⚇⍟◶⊘⎊⍎⍕⟨⟩√⋆⌽𝕨∊↑∧⊔⊏⊐π←→↙𝕎⍷𝕣⍋⊑⊒⍳⊣⊢⍉𝕤↕𝕗𝕘⊸∘○⟜⋄↖𝕊𝔽𝔾«⌾»·˙⥊𝕩↓∨⌊≡∾≍≠⋈𝕏⍒⌈≢≤≥⇐‿↩');
    let key_map = {};
    bqk.forEach((k, i) => key_map[k] = bqv[i]);
    // taken and modified from prollings/apl_backtick_symbols
    let pending = false;
    const command = vscode_1.default.commands.registerTextEditorCommand("language-bqn.backslash", (te, e) => {
        e.insert(te.selection.active, "\\");
        if (pending) {
            return 0;
        }
        pending = true;
        const apos = te.selection.active;
        const sub1 = vscode_1.default.workspace.onDidChangeTextDocument(_ => {
            sub1.dispose();
            const sub2 = vscode_1.default.workspace.onDidChangeTextDocument(ev => {
                sub2.dispose();
                const tpos = ev.contentChanges[0].range.start;
                const cond = (tpos.line === apos.line
                    && (tpos.character - apos.character) === 1
                    && ev.contentChanges[0].text.length === 1);
                if (cond) {
                    let range = new vscode_1.default.Range(apos, tpos.translate(0, 1));
                    let key = ev.contentChanges[0].text;
                    if (key in key_map) {
                        te.edit((e) => e.replace(range, key_map[key])).then();
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
    const tokenTypes = ['string'];
    const tokenModifiers = ['string'];
    const legend = new vscode_1.default.SemanticTokensLegend(tokenTypes, tokenModifiers);
    const provider = {
        provideDocumentSemanticTokens(document) {
            // analyze the document and return semantic tokens
            console.log(document);
            const tokensBuilder = new vscode_1.default.SemanticTokensBuilder(legend);
            // on line 1, characters 1-5 are a class declaration
            tokensBuilder.push(new vscode_1.default.Range(new vscode_1.default.Position(1, 1), new vscode_1.default.Position(1, 5)), 'class', ['declaration']);
            return tokensBuilder.build();
        }
    };
    const selector = { language: 'bqn', scheme: 'file' };
    const prov = vscode_1.default.languages.registerDocumentSemanticTokensProvider(selector, provider, legend);
    context.subscriptions.push(prov);
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
        terminal = vscode_1.default.window.createTerminal({
            name: "BQN", shellPath: config.executablePath, isTransient: true
        });
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
