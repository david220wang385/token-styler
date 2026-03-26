import * as vscode from 'vscode';

// ── Types ────────────────────────────────────────────────────────────────────

interface StyleEntry {
  token: string;
  background: string;
  foreground?: string;
  decorationType: vscode.TextEditorDecorationType;
}

interface PresetStyle {
  background: string;
  foreground: string;
}

// ── State ────────────────────────────────────────────────────────────────────

// Map: documentUri -> list of active styled tokens
const docStyles = new Map<string, StyleEntry[]>();

// ── Activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {

  // Re-apply decorations when switching tabs or editing
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) { applyAllDecorations(editor); }
    }),
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === event.document) {
        applyAllDecorations(editor);
      }
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      // Clean up decoration types for closed documents
      const key = doc.uri.toString();
      const entries = docStyles.get(key);
      if (entries) {
        entries.forEach(e => e.decorationType.dispose());
        docStyles.delete(key);
      }
    })
  );

  // ── Command registrations ─────────────────────────────────────────────────

  const presetCommands: [string, number][] = [
    ['tokenStyler.styleTokenWithColor1', 0],
    ['tokenStyler.styleTokenWithColor2', 1],
    ['tokenStyler.styleTokenWithColor3', 2],
    ['tokenStyler.styleTokenWithColor4', 3],
    ['tokenStyler.styleTokenWithColor5', 4],
  ];

  presetCommands.forEach(([cmd, idx]) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd, () => styleWithPreset(idx))
    );
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('tokenStyler.styleTokenCustomColor', styleWithCustomColor),
    vscode.commands.registerCommand('tokenStyler.clearTokenStyle', clearTokenStyle),
    vscode.commands.registerCommand('tokenStyler.clearAllStyles', clearAllStyles)
  );
}

// ── Core Logic ────────────────────────────────────────────────────────────────

function getToken(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return undefined; }

  const selection = editor.selection;

  // If something is selected, use that; otherwise expand to word at cursor
  if (!selection.isEmpty) {
    return editor.document.getText(selection).trim();
  }

  const wordRange = editor.document.getWordRangeAtPosition(selection.active);
  if (wordRange) {
    return editor.document.getText(wordRange);
  }

  return undefined;
}

function getPresets(): PresetStyle[] {
  const config = vscode.workspace.getConfiguration('tokenStyler');
  return config.get<PresetStyle[]>('styles') ?? [
    { background: '#FFFF00', foreground: '#000000' },
    { background: '#00FFFF', foreground: '#000000' },
    { background: '#00FF00', foreground: '#000000' },
    { background: '#FF00FF', foreground: '#000000' },
    { background: '#FF6060', foreground: '#000000' },
  ];
}

function styleWithPreset(index: number) {
  const token = getToken();
  if (!token) {
    vscode.window.showWarningMessage('Token Styler: No word selected or under cursor.');
    return;
  }
  const presets = getPresets();
  const preset = presets[index % presets.length];
  applyStyle(token, preset.background, preset.foreground);
}

async function styleWithCustomColor() {
  const token = getToken();
  if (!token) {
    vscode.window.showWarningMessage('Token Styler: No word selected or under cursor.');
    return;
  }

  // Ask for background color
  const bgInput = await vscode.window.showInputBox({
    title: 'Token Styler: Background Color',
    prompt: `Enter background color for "${token}" (hex, e.g. #FF8800)`,
    value: '#FFFF00',
    validateInput: val => isValidHex(val) ? null : 'Enter a valid hex color like #RRGGBB or #RGB'
  });
  if (!bgInput) { return; }

  // Ask for foreground color
  const fgInput = await vscode.window.showInputBox({
    title: 'Token Styler: Text Color',
    prompt: `Enter text color for "${token}" (hex, leave empty for default)`,
    value: '#000000',
    validateInput: val => (!val || isValidHex(val)) ? null : 'Enter a valid hex color or leave empty'
  });
  // fgInput === undefined means user pressed Escape; empty string is valid (use default)
  if (fgInput === undefined) { return; }

  applyStyle(token, bgInput, fgInput || undefined);
}

async function clearTokenStyle() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const key = editor.document.uri.toString();
  const entries = docStyles.get(key);
  if (!entries || entries.length === 0) {
    vscode.window.showInformationMessage('Token Styler: No styled tokens in this file.');
    return;
  }

  // Let the user pick which token to clear
  const token = getToken();
  if (token) {
    // Try to auto-clear the token under cursor first
    const idx = entries.findIndex(e => e.token === token);
    if (idx !== -1) {
      entries[idx].decorationType.dispose();
      entries.splice(idx, 1);
      if (entries.length === 0) { docStyles.delete(key); }
      return;
    }
  }

  // Fallback: quick-pick
  const items = entries.map(e => ({
    label: e.token,
    description: `bg: ${e.background}${e.foreground ? '  fg: ' + e.foreground : ''}`
  }));

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Token Styler: Clear Style',
    placeHolder: 'Select a token to remove its style'
  });
  if (!picked) { return; }

  const idx = entries.findIndex(e => e.token === picked.label);
  if (idx !== -1) {
    entries[idx].decorationType.dispose();
    entries.splice(idx, 1);
    if (entries.length === 0) { docStyles.delete(key); }
  }
}

function clearAllStyles() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const key = editor.document.uri.toString();
  const entries = docStyles.get(key);
  if (entries) {
    entries.forEach(e => e.decorationType.dispose());
    docStyles.delete(key);
  }
  vscode.window.showInformationMessage('Token Styler: All styles cleared.');
}

// ── Decoration Engine ─────────────────────────────────────────────────────────

function applyStyle(token: string, background: string, foreground?: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const key = editor.document.uri.toString();
  if (!docStyles.has(key)) { docStyles.set(key, []); }
  const entries = docStyles.get(key)!;

  // If this token already has a style, remove the old one first
  const existing = entries.findIndex(e => e.token === token);
  if (existing !== -1) {
    entries[existing].decorationType.dispose();
    entries.splice(existing, 1);
  }

  // Create a new decoration type
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: background,
    color: foreground,
    borderRadius: '2px',
  });

  entries.push({ token, background, foreground, decorationType });

  // Apply immediately
  applyAllDecorations(editor);

  vscode.window.showInformationMessage(
    `Token Styler: "${token}" highlighted in ${background}`
  );
}

function applyAllDecorations(editor: vscode.TextEditor) {
  const key = editor.document.uri.toString();
  const entries = docStyles.get(key);
  if (!entries || entries.length === 0) { return; }

  const config = vscode.workspace.getConfiguration('tokenStyler');
  const matchCase = config.get<boolean>('matchCase') ?? true;
  const matchWholeWord = config.get<boolean>('matchWholeWord') ?? false;
  const text = editor.document.getText();

  for (const entry of entries) {
    const flags = matchCase ? 'g' : 'gi';
    const escapedToken = escapeRegex(entry.token);
    const pattern = matchWholeWord ? `\\b${escapedToken}\\b` : escapedToken;

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      continue;
    }

    const ranges: vscode.Range[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = editor.document.positionAt(match.index);
      const end = editor.document.positionAt(match.index + match[0].length);
      ranges.push(new vscode.Range(start, end));
    }

    editor.setDecorations(entry.decorationType, ranges);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidHex(val: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val.trim());
}

// ── Deactivation ──────────────────────────────────────────────────────────────

export function deactivate() {
  for (const entries of docStyles.values()) {
    entries.forEach(e => e.decorationType.dispose());
  }
  docStyles.clear();
}
