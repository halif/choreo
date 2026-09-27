#!/usr/bin/env bash
set -e

# ==============================================================================
# ANSI COLOR PALETTE (Choreo Theme)
# ==============================================================================
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# Primary colors
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
SKY='\033[0;36m'
PURPLE='\033[0;35m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'

# Formatted output functions
log_info()    { echo -e "  ${SKY}ℹ${RESET}  ${WHITE}$1${RESET}"; }
log_success() { echo -e "  ${GREEN}✔${RESET}  ${BOLD}${GREEN}$1${RESET}"; }
log_warn()    { echo -e "  ${AMBER}⚠${RESET}  ${AMBER}$1${RESET}"; }
log_error()   { echo -e "  ${RED}✖${RESET}  ${BOLD}${RED}$1${RESET}"; }
log_step()    { echo -e "\n${BOLD}${PURPLE}==>${RESET} ${BOLD}${WHITE}$1${RESET}"; }

clear 2>/dev/null || true

# Choreo Banner
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
# 1. NODE.JS CHECK & INSTALLATION
# ------------------------------------------------------------------------------
log_step "Step 1: Checking Node.js runtime environment"

MIN_NODE_VER=18
CURRENT_NODE_VER=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")

if [ -z "$CURRENT_NODE_VER" ] || [ "$CURRENT_NODE_VER" -lt "$MIN_NODE_VER" ]; then
    log_warn "Node.js is not installed or version is outdated (current: v${CURRENT_NODE_VER:-none}, required: v${MIN_NODE_VER}+)."
    log_info "Connecting official NodeSource repository (Node.js 20 LTS)..."

    if [ -f /etc/debian_version ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
        sudo apt-get install -y nodejs build-essential >/dev/null 2>&1
    elif [ -f /etc/redhat-release ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - >/dev/null 2>&1
        sudo yum install -y nodejs gcc-c++ make >/dev/null 2>&1
    else
        log_error "Failed to automatically detect OS package manager."
        echo -e "  Please install Node.js 18+ manually: https://nodejs.org/"
        exit 1
    fi
fi

NODE_VERSION_STR=$(node -v 2>/dev/null || echo "not found")
NPM_VERSION_STR=$(npm -v 2>/dev/null || echo "not found")
log_success "Node.js ${NODE_VERSION_STR} and npm v${NPM_VERSION_STR} are ready."

# ------------------------------------------------------------------------------
# 2. NPM DEPENDENCIES INSTALLATION
# ------------------------------------------------------------------------------
log_step "Step 2: Installing project dependencies (npm install)"
log_info "Downloading packages from package.json..."

npm install --silent

log_success "All dependencies successfully installed."

# ------------------------------------------------------------------------------
# 3. PROJECT BUILD
# ------------------------------------------------------------------------------
log_step "Step 3: Building client and server bundles (npm run build)"
log_info "Compiling Vite SPA and generating dist/..."

npm run build

log_success "Build completed without errors."

# ------------------------------------------------------------------------------
# 4. SYSTEMD SERVICE CONFIGURATION & GENERATION
# ------------------------------------------------------------------------------
log_step "Step 4: Configuring systemd daemon service"

CHOREO_DIR="$(pwd)"
CURRENT_USER="${SUDO_USER:-$USER}"
NODE_BIN="$(which node)"

# Create a symlink in /usr/bin if needed (e.g., if node is managed by NVM)
if [ "$NODE_BIN" != "/usr/bin/node" ] && [ ! -f /usr/bin/node ]; then
    log_info "Creating system symlink /usr/bin/node -> ${NODE_BIN}"
    sudo ln -sf "$NODE_BIN" /usr/bin/node || true
fi

log_info "Generating unit file: ${WHITE}/etc/systemd/system/choreo.service${RESET}"

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
# 5. RELOAD & START SERVICE
# ------------------------------------------------------------------------------
log_step "Step 5: Registering and starting Choreo service"

sudo systemctl daemon-reload
sudo systemctl enable choreo >/dev/null 2>&1
sudo systemctl restart choreo

sleep 2

# Determine server local IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\n${GREEN}============================================================${RESET}"
echo -e " ${BOLD}${GREEN}🎉 INSTALLATION COMPLETED SUCCESSFULLY!${RESET}"
echo -e "${GREEN}============================================================${RESET}\n"

echo -e "  ${WHITE}Web interface is accessible at:${RESET}"
echo -e "  ${BOLD}${SKY}▶  http://${SERVER_IP}:3000${RESET}"
echo -e "  ${BOLD}${SKY}▶  http://localhost:3000${RESET}\n"

echo -e "  ${WHITE}Useful service management commands:${RESET}"
echo -e "  ${DIM}• Check status:${RESET}   ${AMBER}sudo systemctl status choreo${RESET}"
echo -e "  ${DIM}• Restart:${RESET}        ${AMBER}sudo systemctl restart choreo${RESET}"
echo -e "  ${DIM}• View logs:${RESET}      ${AMBER}sudo journalctl -u choreo -f${RESET}\n"

echo -e "${GRAY}------------------------------------------------------------${RESET}"
sudo systemctl status choreo --no-pager -l