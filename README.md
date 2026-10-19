# Myoffice

Myoffice is a desktop and Android office app built with TypeScript, React, Tiptap, Electron, and Capacitor. The web build is an internal asset used by both application shells; it is not distributed as a standalone web version.

## Run

```bash
npm install
npm run desktop
```

The Vite server started by `npm run desktop` is only for local development. Electron Builder has targets configured for Linux AppImage, Windows NSIS, and macOS DMG; build each installer on its target operating system.

## Android

Install Android Studio, its Android SDK, and JDK 21. Run `npm run android:open` to build the shared interface, sync it into `android/`, and open the native project. Run from Android Studio on a device or emulator. `npm run android:run` runs the same sync and launches on a connected device. To create a test APK from the command line, run `npm run android:sync` and then `cd android && ./gradlew assembleDebug`; the APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`. Android exports open the system Save document picker. The Android app stores its own drafts on the device; drafts from an existing desktop install are separate and should be exported/imported as files when moving between devices.

On this Linux computer, a local Android 14 emulator is installed. Launch it with `./run-android-emulator.sh` or the **Myoffice Android Emulator** desktop shortcut. It uses a 540 × 960 screen, two virtual CPU cores, and KVM acceleration. The SDK and JDK are under `~/.local/share/myoffice-build-tools/`. To build and install on that emulator:

```bash
npm run android:sync
cd android
JAVA_HOME="$HOME/.local/share/myoffice-build-tools/jdk/usr/lib/jvm/java-21-openjdk-amd64" \
ANDROID_HOME="$HOME/.local/share/myoffice-build-tools/sdk" ./gradlew assembleDebug
"$HOME/.local/share/myoffice-build-tools/sdk/platform-tools/adb" install -r app/build/outputs/apk/debug/app-debug.apk
```

On this Linux desktop, double-click `Myoffice.desktop` on the Desktop to run the packaged app. It launches `dist/linux-unpacked/myoffice` through `run-desktop.sh`, so it does not require the FUSE library needed by the AppImage. After changing the app, run `npm run build:desktop` to refresh the packaged files.

## Current Word features

- Fixed Home, Insert, Design, Layout, References, Review, and View tabs, with a circuit patterned title strip and white ribbon controls.
- Horizontal and vertical inch rulers that follow page size and zoom. Drag each margin marker independently. Zoom ranges from 50% to 160%.
- Separate visible pages that fill automatically as writing continues, with current page and word count in the bottom status bar.
- Headings, font family and size, bold, italic, underline, strike, subscript, superscript, colors, highlights, lists, checklists, quotes, alignment, and undo/redo.
- Tables, images from files, links, symbols, dates, page breaks, headers, footers, captions, and page numbers.
- A4, Letter, and Legal sizes; portrait/landscape; margins; a page color palette and custom color picker; page borders; and text or picture watermarks. Watermarks appear in printed pages, PDFs, and DOCX exports. The Design tab's Text highlight section colors selected text.
- Multiple open document tabs. New opens a blank document while preserving the current document; switching tabs and reloading restores both.
- Basic find and local autosave. Open DOCX, HTML, TXT, and legacy `.myoffice` files. Save As and Export DOCX create real Microsoft Word files; PDF, HTML, TXT, and optional `.myoffice` backup exports remain available on desktop and Android.
- Word-style shortcuts include Ctrl/Cmd+S (save), Shift+Ctrl/Cmd+S or F12 (Save As), Ctrl/Cmd+N (new document), O (open), P (print), F (find), H (replace), K (link), Enter (page break), W (close tab), E/L/R/J (alignment), Shift+L (bullets), Shift+N (normal paragraph), Ctrl+Alt+1/2/3 (headings), and font size keys. The editor also supports bold, italic, underline, and undo/redo shortcuts.

## Current limits

This is not Microsoft Word feature parity. DOCX conversion supports common text formatting, headings, tables, images, page layout, headers, footers, and page numbers; complex Word features can change on import or export. Custom per-page Roman numeral ranges are not yet preserved in DOCX. XLSX is the separate Excel workbook format and is not produced by this Word editor. Drafts stored only in application storage can be lost if that storage is cleared; use Save As DOCX for important drafts. Direct PDF export currently rasterizes the document, so text in that PDF is not selectable.

DOCX export uses `docx` (MIT); DOCX import uses Mammoth (BSD-2-Clause), DOMPurify (Apache-2.0 option), and JSZip (MIT option).

## Progress screenshots

The `progress/` folder contains screenshots from the first and expanded Word milestones. The latest reference-style screenshots start at `11-reference-style-home.png`; `13-file-menu.png` shows the updated File menu. `16-new-document-tab.png` and `17-page-two-flow.png` show document tabs and content flowing to a second sheet.
# MyOffice
