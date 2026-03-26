# Token Styler — VS Code Extension

Highlight all occurrences of any token with a custom background color, just like **Notepad++'s "Style Token"** right-click feature.

---

## Features

- **Right-click → Style Token** submenu with 5 preset colors + custom color picker
- Highlights **all occurrences** in the current file instantly
- **Persists** across edits — decorations update as you type
- **Clear individual** token styles or **clear all** at once
- Configurable: case-sensitive, whole-word matching
- Customizable preset colors in Settings

---

## Usage

### Via Right-Click Context Menu

1. **Select a word** (or just place your cursor on a word)
2. **Right-click** → **Style Token**
3. Choose one of:
   - **Style 1–5** — instant preset colors (Yellow, Cyan, Green, Magenta, Red)
   - **Custom Color...** — enter any hex color
   - **Clear Token Style** — remove style for current/selected token
   - **Clear All Token Styles** — remove all highlights in file

### Via Command Palette

Open `Ctrl+Shift+P` (or `Cmd+Shift+P`) and search for **"Style Token"**.

---

## Preset Colors (Notepad++ style)

| Style | Background | Text  |
|-------|-----------|-------|
| 1     | #FFFF00   | Black |
| 2     | #00FFFF   | Black |
| 3     | #00FF00   | Black |
| 4     | #FF00FF   | Black |
| 5     | #FF6060   | Black |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `tokenStyler.matchCase` | `true` | Case-sensitive token matching |
| `tokenStyler.matchWholeWord` | `false` | Match whole words only |
| `tokenStyler.styles` | 5 presets | Customize preset background/foreground colors |

### Custom Presets Example (`settings.json`)

```json
"tokenStyler.styles": [
  { "background": "#FFD700", "foreground": "#000000" },
  { "background": "#40E0D0", "foreground": "#000000" },
  { "background": "#98FB98", "foreground": "#000000" },
  { "background": "#DDA0DD", "foreground": "#000000" },
  { "background": "#FA8072", "foreground": "#000000" }
]
```

---

## Installation (from source)

```bash
# 1. Clone / download the extension folder
cd token-styler

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Install vsce if needed
npm install -g @vscode/vsce

# 5. Package as .vsix
vsce package

# 6. Install in VS Code
# Extensions panel → ⋯ menu → "Install from VSIX..."
# Select token-styler-1.0.0.vsix
```

### Development (run without packaging)

1. Open the `token-styler` folder in VS Code
2. Press **F5** → launches an Extension Development Host
3. Test the extension live

---

## How It Works

- Uses VS Code's `TextEditorDecorationType` API to apply colored background ranges
- All occurrences are found via regex scan of the full document text
- Decorations are re-applied on every document change and tab switch
- Each document maintains its own independent set of styled tokens

---

## License

MIT
