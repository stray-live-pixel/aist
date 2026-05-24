#!/usr/bin/env bash
set -euo pipefail

REPO="${AIST_REPO:-stray-live-pixel/aist}"
REF="${AIST_REF:-main}"
VERSION="${AIST_VERSION:-0.0.1}"
EXTENSION_NAME="${AIST_EXTENSION_NAME:-aist}"
VSCODE_CLI="${VSCODE_CLI:-code}"
VSIX_FILE="${EXTENSION_NAME}-${VERSION}.vsix"
VSIX_URL="https://raw.githubusercontent.com/${REPO}/${REF}/releases/${VSIX_FILE}"
TMP_DIR="$(mktemp -d)"
VSIX_PATH="${TMP_DIR}/${VSIX_FILE}"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

download() {
  if command_exists curl; then
    curl -fL "${VSIX_URL}" -o "${VSIX_PATH}"
  elif command_exists wget; then
    wget -O "${VSIX_PATH}" "${VSIX_URL}"
  else
    echo "Ошибка: нужен curl или wget для скачивания ${VSIX_URL}." >&2
    exit 1
  fi
}

restart_vscode() {
  case "$(uname -s)" in
    Darwin)
      osascript -e 'tell application "Visual Studio Code" to quit' >/dev/null 2>&1 || true
      sleep 2
      open -a "Visual Studio Code"
      ;;
    Linux)
      pkill -f '(^|/)code([^/]* )?' >/dev/null 2>&1 || true
      sleep 2
      nohup "${VSCODE_CLI}" >/dev/null 2>&1 &
      ;;
    MINGW*|MSYS*|CYGWIN*)
      taskkill //IM Code.exe //F >/dev/null 2>&1 || true
      sleep 2
      powershell.exe -NoProfile -Command "Start-Process code" >/dev/null 2>&1 || "${VSCODE_CLI}" >/dev/null 2>&1 &
      ;;
    *)
      echo "Неизвестная ОС: перезапустите VS Code вручную." >&2
      return 0
      ;;
  esac
}

if ! command_exists "${VSCODE_CLI}"; then
  echo "Ошибка: команда '${VSCODE_CLI}' не найдена. Установите VS Code Shell Command или задайте VSCODE_CLI." >&2
  exit 1
fi

echo "Скачиваю ${VSIX_URL}..."
download

echo "Устанавливаю ${VSIX_PATH}..."
"${VSCODE_CLI}" --install-extension "${VSIX_PATH}" --force

echo "Перезапускаю VS Code..."
restart_vscode

echo "Готово. Расширение ${EXTENSION_NAME} ${VERSION} установлено."
