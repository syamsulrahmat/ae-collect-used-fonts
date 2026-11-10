# After Effects — Collect Used Fonts

[![After Effects](https://img.shields.io/badge/Adobe%20After%20Effects-24.3%2B-blue.svg)](https://www.adobe.com/products/aftereffects.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An ExtendScript (`.jsx`) for Adobe After Effects that scans an entire project, identifies all font files used by text layers, and copies them into a dedicated `Fonts/` folder. It also creates a detailed text report of collected and unavailable fonts.

---

## ✨ Features

- **Project-Wide & Nested Comp Traversal**: Recursively scans all compositions and nested pre-comps without infinite loops.
- **Per-Character Font Detection**: Uses the `characterRange()` API to detect multiple mixed fonts within a single text layer.
- **Animated Text Support**: Inspects all keyframes on animated `Source Text` properties, ensuring fonts used at any point in the timeline are captured.
- **Safe Copy & Collision Avoidance**: Automatically handles filename collisions by adding numeric increments (`font_2.ttf`) to prevent accidental overwriting.
- **De-duplication**: Copies duplicate font references only once.
- **Detailed Collection Report**: Generates a `Font Collection Report.txt` listing successfully copied fonts (with source and destination paths) as well as any unavailable/cloud fonts.

---

## 📋 Requirements

- **Adobe After Effects 24.3 or newer**
  > [!NOTE]
  > After Effects 24.3 introduced the `characterRange()` API and `fontLocation` property on `TextDocument`, which this script requires to locate physical font files on disk.

---

## 🚀 Installation & Usage

### 1. Download
Download [`Collect_Used_Fonts.jsx`](Collect_Used_Fonts.jsx) from this repository.

### 2. Run in After Effects
1. Open your project in **Adobe After Effects (v24.3+)**.
2. Go to:
   ```
   File > Scripts > Run Script File...
   ```
3. Select `Collect_Used_Fonts.jsx`.
4. Choose the destination folder where you want your fonts collected.

### 3. Output Structure
Once complete, the selected directory will contain:
```
Your_Chosen_Folder/
├── Fonts/
│   ├── FontName-Regular.ttf
│   ├── AnotherFont-Bold.otf
│   └── ...
└── Font Collection Report.txt
```

---

## ⚠️ Notes on Unavailable Fonts

Some fonts may appear under **Unavailable** in the collection report:
- **Adobe Fonts / Cloud Fonts**: If After Effects cannot resolve a physical local file path for cloud-synced fonts, it logs them in the report.
- **System-Protected Fonts**: Certain operating system fonts or fonts without read permissions cannot be copied directly.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
