#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_dir"

if [[ ! -f package-lock.json || ! -f package.json ]]; then
  echo "Myoffice source files are missing. Clone the full repository first." >&2
  exit 1
fi

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Install Node.js and npm first: sudo apt install nodejs npm" >&2
  exit 1
fi

node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<12)){console.error("Myoffice needs Node.js 22.12 or newer.");process.exit(1)}'

npm ci
npm run build
npx electron-builder --linux dir --x64

install_dir="$HOME/.local/opt/myoffice"
launcher="$HOME/.local/bin/myoffice"
desktop_file="$HOME/.local/share/applications/myoffice.desktop"
icon="$HOME/.local/share/icons/hicolor/scalable/apps/myoffice.svg"

mkdir -p "$install_dir" "$(dirname "$launcher")" "$(dirname "$desktop_file")" "$(dirname "$icon")"
cp -a dist/linux-unpacked/. "$install_dir/"
install -m 644 public/favicon.svg "$icon"

cat > "$launcher" <<EOF
#!/usr/bin/env bash
unset ELECTRON_RUN_AS_NODE
exec "$install_dir/myoffice" "\$@"
EOF
chmod +x "$launcher"

cat > "$desktop_file" <<EOF
[Desktop Entry]
Type=Application
Name=Myoffice
Comment=Office documents, spreadsheets and presentations
Exec=$launcher
Icon=myoffice
Terminal=false
Categories=Office;WordProcessor;Spreadsheet;Presentation;
StartupWMClass=myoffice
EOF

if command -v update-desktop-database >/dev/null; then
  update-desktop-database "$HOME/.local/share/applications" || true
fi

echo "Myoffice installed. Start it from the application menu or run: $launcher"
