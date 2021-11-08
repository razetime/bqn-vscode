import vscode from 'vscode';
//import { promises } from 'dns';

type Cmd = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void

// Keyboard symbols.

		
let terminal: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
    
    // BQN keymap
    const bqk = Array.from('`123456890-=~!@#$%^&*()_+qwertuiop[]QWERTIOP{}asdfghjkl;ASFGHKL:"zxcvbm,./ZXVBM<>? \'');
    const bqv = Array.from('˜˘¨⁼⌜´˝∞¯•÷×¬⎉⚇⍟◶⊘⎊⍎⍕⟨⟩√⋆⌽𝕨∊↑∧⊔⊏⊐π←→↙𝕎⍷𝕣⍋⊑⊒⍳⊣⊢⍉𝕤↕𝕗𝕘⊸∘○⟜⋄↖𝕊𝔽𝔾«⌾»·˙⥊𝕩↓∨⌊≡∾≍≠⋈𝕏⍒⌈≢≤≥⇐‿↩');
    let key_map : { [key: string]: string; }= {};
    for(let i = 0; i < bqk.length; i++) {
        key_map[bqk[i]] = bqv[i];
    }
    console.log(key_map);
    // taken and lightly changed from prollings/apl_backtick_symbols
	let pending = false;

	const command = vscode.commands.registerTextEditorCommand("language-bqn.backslash", (te, e) => {
		e.insert(te.selection.active, "\\");
		if (pending) {
			return 0;
		}
		pending = true;
		let active_pos = te.selection.active;
		let sub1 = vscode.workspace.onDidChangeTextDocument(_ => {
			sub1.dispose();
			let sub2 = vscode.workspace.onDidChangeTextDocument(ev => {
				sub2.dispose();
				let this_pos = ev.contentChanges[0].range.start;
				if (this_pos.line === active_pos.line
					&& (this_pos.character - active_pos.character) === 1
					&& ev.contentChanges[0].text.length === 1) {
						let replace_range = new vscode.Range(active_pos, this_pos.translate(0, 1));
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

    const cmds: [string, Cmd][] = [
        ['language-bqn.createTerminal', createTerminal],
        ['language-bqn.loadScript', loadScript],
        ['language-bqn.executeSelection', executeSelection],
        ['language-bqn.executeLine', executeLine],
        ['language-bqn.executeLineAdvance', executeLineAdvance]
    ];
    for(const [n, f] of cmds) { vscode.commands.registerTextEditorCommand(n, f) }


   context.subscriptions.push(command);

}

export function deactivate(context: vscode.ExtensionContext) {
    if (terminal != null) { terminal.dispose() }
}

function createTerminal() {
    if (terminal == null || terminal.exitStatus != undefined) {
        const config = vscode.workspace.getConfiguration('bqn');

        terminal = vscode.window.createTerminal("BQN", config.executablePath);
        terminal.show();
    }
}

function loadScript(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    createTerminal()

    terminal.sendText(`)ex ${t.document.fileName}`)
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
