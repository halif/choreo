#!/usr/bin/env bash
set -e

# ==============================================================================
# ЦВЕТОВАЯ ПАЛИТРА ANSI (Choreo Theme)
# ==============================================================================
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# Основные цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
SKY='\033[0;36m'
PURPLE='\033[0;35m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'

# Функции форматированного вывода
log_info()    { echo -e "  ${SKY}ℹ${RESET}  ${WHITE}$1${RESET}"; }
log_success() { echo -e "  ${GREEN}✔${RESET}  ${BOLD}${GREEN}$1${RESET}"; }
log_warn()    { echo -e "  ${AMBER}⚠${RESET}  ${AMBER}$1${RESET}"; }
log_error()   { echo -e "  ${RED}✖${RESET}  ${BOLD}${RED}$1${RESET}"; }
log_step()    { echo -e "\n${BOLD}${PURPLE}==>${RESET} ${BOLD}${WHITE}$1${RESET}"; }

clear 2>/dev/null || true

# Баннер Choreo
echo -e "${AMBER}"
cat << "EOF"
   ______ __
  / ____// /_   ____   _____ ___   ____
 / /    / __ \ / __ \ / ___// _ \ / __ \
/ /___ / / / // /_/ // /   /  __// /_/ /
\____//_/ /_/ \____//_/    \___/ \____/
EOF
echo -e "${RESET}"
echo -e " ${BOLD}${WHITE}🎭 Choreo v2.5.0 — Puppet Fleet Management Dashboard${RESET}"
echo -e " ${GRAY}------------------------------------------------------------${RESET}"
echo -e " ${DIM}Automated Systemd Service Installer & Environment Setup${RESET}\n"

# ------------------------------------------------------------------------------
# 1. ПРОВЕРКА И УСТАНОВКА NODE.JS
# ------------------------------------------------------------------------------
log_step "Шаг 1: Проверка среды исполнения Node.js"

MIN_NODE_VER=18
CURRENT_NODE_VER=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")

if [ -z "$CURRENT_NODE_VER" ] || [ "$CURRENT_NODE_VER" -lt "$MIN_NODE_VER" ]; then
    log_warn "Node.js не установлен или версия устарела (текущая: v${CURRENT_NODE_VER:-нет}, требуется: v${MIN_NODE_VER}+)."
    log_info "Подключение официального репозитория NodeSource (Node.js 20 LTS)..."

    if [ -f /etc/debian_version ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
        sudo apt-get install -y nodejs build-essential >/dev/null 2>&1
    elif [ -f /etc/redhat-release ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - >/dev/null 2>&1
        sudo yum install -y nodejs gcc-c++ make >/dev/null 2>&1
    else
        log_error "Не удалось автоматически определить пакетный менеджер ОС."
        echo -e "  Пожалуйста, установите Node.js 18+ вручную: https://nodejs.org/"
        exit 1
    fi
fi

NODE_VERSION_STR=$(node -v 2>/dev/null || echo "не найден")
NPM_VERSION_STR=$(npm -v 2>/dev/null || echo "не найден")
log_success "Node.js ${NODE_VERSION_STR} и npm v${NPM_VERSION_STR} готовы к работе."

# ------------------------------------------------------------------------------
# 2. УСТАНОВКА ЗАВИСИМОСТЕЙ NPM
# ------------------------------------------------------------------------------
log_step "Шаг 2: Установка зависимостей проекта (npm install)"
log_info "Загрузка пакетов из package.json..."

npm install --silent

log_success "Все зависимости успешно установлены."

# ------------------------------------------------------------------------------
# 3. СБОРКА ПРОЕКТА
# ------------------------------------------------------------------------------
log_step "Шаг 3: Сборка клиентского и серверного бандлов (npm run build)"
log_info "Компиляция Vite SPA и генерация dist/..."

npm run build

log_success "Сборка завершена без ошибок."

# ------------------------------------------------------------------------------
# 4. НАСТРОЙКА И ГЕНЕРАЦИЯ SYSTEMD СЛУЖБЫ
# ------------------------------------------------------------------------------
log_step "Шаг 4: Конфигурация системного демона systemd"

CHOREO_DIR="$(pwd)"
CURRENT_USER="${SUDO_USER:-$USER}"
NODE_BIN="$(which node)"

# Создание симлинка в /usr/bin при необходимости (например, если node из NVM)
if [ "$NODE_BIN" != "/usr/bin/node" ] && [ ! -f /usr/bin/node ]; then
    log_info "Создание системного симлинка /usr/bin/node -> ${NODE_BIN}"
    sudo ln -sf "$NODE_BIN" /usr/bin/node || true
fi

log_info "Генерация unit-файла: ${WHITE}/etc/systemd/system/choreo.service${RESET}"

sudo bash -c "cat <<EOF > /etc/systemd/system/choreo.service
[Unit]
Description=Choreo Puppet Management Dashboard
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CHOREO_DIR
Environment=NODE_ENV=production
ExecStart=$NODE_BIN dist/server.cjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

# ------------------------------------------------------------------------------
# 5. ПЕРЕЗАГРУЗКА И СТАРТ СЛУЖБЫ
# ------------------------------------------------------------------------------
log_step "Шаг 5: Регистрация и запуск службы Choreo"

sudo systemctl daemon-reload
sudo systemctl enable choreo >/dev/null 2>&1
sudo systemctl restart choreo

sleep 2

# Определение локального IP сервера
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\n${GREEN}============================================================${RESET}"
echo -e " ${BOLD}${GREEN}🎉 УСТАНОВКА УСПЕШНО ЗАВЕРШЕНА!${RESET}"
echo -e "${GREEN}============================================================${RESET}\n"

echo -e "  ${WHITE}Веб-интерфейс доступен по адресам:${RESET}"
echo -e "  ${BOLD}${SKY}▶  http://${SERVER_IP}:3000${RESET}"
echo -e "  ${BOLD}${SKY}▶  http://localhost:3000${RESET}\n"

echo -e "  ${WHITE}Полезные команды для управления службой:${RESET}"
echo -e "  ${DIM}• Проверить статус:${RESET}   ${AMBER}sudo systemctl status choreo${RESET}"
echo -e "  ${DIM}• Перезапустить:${RESET}      ${AMBER}sudo systemctl restart choreo${RESET}"
echo -e "  ${DIM}• Просмотр логов:${RESET}     ${AMBER}sudo journalctl -u choreo -f${RESET}\n"

echo -e "${GRAY}------------------------------------------------------------${RESET}"
sudo systemctl status choreo --no-pager -l
