import vscode from 'vscode';

type Cmd = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void

let terminal: vscode.Terminal;

export function activate(context: vscode.ExtensionContext) {
    const bqk = Array.from('`123456890-=~!@#$%^&*()_+qwertuiop[]QWERTIOP{}asdfghjkl;ASFGHKL:"zxcvbm,./ZXVBM<>? \'');
    const bqv = Array.from('˜˘¨⁼⌜´˝∞¯•÷×¬⎉⚇⍟◶⊘⎊⍎⍕⟨⟩√⋆⌽𝕨∊↑∧⊔⊏⊐π←→↙𝕎⍷𝕣⍋⊑⊒⍳⊣⊢⍉𝕤↕𝕗𝕘⊸∘○⟜⋄↖𝕊𝔽𝔾«⌾»·˙⥊𝕩↓∨⌊≡∾≍≠⋈𝕏⍒⌈≢≤≥⇐‿↩');
    let key_map: {[key: string]: string} = {};  bqk.forEach((k, i) => key_map[k] = bqv[i])

    // taken and modified from prollings/apl_backtick_symbols
	let pending = false;

	const command = vscode.commands.registerTextEditorCommand("language-bqn.backslash", (te, e) => {
		e.insert(te.selection.active, "\\");

		if (pending) {return 0}
		
        pending = true;  const apos = te.selection.active;
		const sub1 = vscode.workspace.onDidChangeTextDocument(_ => {
			sub1.dispose();

			const sub2 = vscode.workspace.onDidChangeTextDocument(ev => {
				sub2.dispose();

				const tpos = ev.contentChanges[0].range.start;
                const cond = (tpos.line === apos.line
                    && (tpos.character - apos.character) === 1
                    && ev.contentChanges[0].text.length === 1)

				if (cond) {
                    let range = new vscode.Range(apos, tpos.translate(0, 1));
                    let key = ev.contentChanges[0].text;
                    if (key in key_map) {te.edit( (e) => e.replace(range, key_map[key]) ).then()}
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
    for(const [n, f] of cmds) {vscode.commands.registerTextEditorCommand(n, f)}

    const tokenTypes = ['string'];
    const tokenModifiers = ['string'];
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

    const provider: vscode.DocumentSemanticTokensProvider = {
        provideDocumentSemanticTokens(document: vscode.TextDocument) :
            vscode.ProviderResult<vscode.SemanticTokens>
        {
            // analyze the document and return semantic tokens
            console.log(document);
            const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
            // on line 1, characters 1-5 are a class declaration
            tokensBuilder.push(
                new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 5)),
                'class',
                ['declaration']
            );
            return tokensBuilder.build();
        }
    };

    const selector = {language: 'bqn',  scheme: 'file'};
    const prov = vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, legend);

    context.subscriptions.push(prov);
    context.subscriptions.push(command);
}

export function deactivate(context: vscode.ExtensionContext) {
    if (terminal != null) {terminal.dispose()}
}

function createTerminal() {
    if (terminal == null || terminal.exitStatus != undefined) {
        const config = vscode.workspace.getConfiguration('bqn');

        terminal = vscode.window.createTerminal({
            name: "BQN",  shellPath: config.executablePath
        });
        terminal.show();
    }
}

function loadScript(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    createTerminal();  terminal.sendText(`)ex ${t.document.fileName}`)
}

function executeSelection(t: vscode.TextEditor, e: vscode.TextEditorEdit) {}
function executeLine(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    createTerminal()

    let line = t.document.lineAt(t.selection.active.line).text
    terminal.sendText(line, !line.endsWith('\n'))
}
function executeLineAdvance(t: vscode.TextEditor, e: vscode.TextEditorEdit) {
    executeLine(t, e)
    vscode.commands.executeCommand('cursorMove', {to: "down",  by: "wrappedLine"})
}
