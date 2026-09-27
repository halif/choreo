#!/usr/bin/env bash
# ==============================================================================
# Choreo Dashboard - Automatic System Service (systemd) Installer
# ==============================================================================
set -e

# Colors for formatted output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}      Choreo Puppet Dashboard - Service Setup         ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Root privileges check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run the script with root privileges or via sudo:${NC}"
  echo -e "  sudo $0"
  exit 1
fi

# 2. Determine the application working directory
# By default, uses the current directory where the script is located
DEFAULT_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
read -r -p "Path to Choreo directory [default: $DEFAULT_APP_DIR]: " INPUT_APP_DIR
APP_DIR="${INPUT_APP_DIR:-$DEFAULT_APP_DIR}"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${RED}[ERROR] package.json not found in directory $APP_DIR!${NC}"
  echo "Make sure you specified the correct path to the Choreo project."
  exit 1
fi

# 3. Port selection
DEFAULT_PORT="3000"
read -r -p "Port to run Choreo on [default: $DEFAULT_PORT]: " INPUT_PORT
PORT="${INPUT_PORT:-$DEFAULT_PORT}"

# 4. Locate node and npm binary paths
NODE_BIN=$(which node 2>/dev/null || true)
NPM_BIN=$(which npm 2>/dev/null || true)

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  echo -e "${RED}[ERROR] Node.js or npm not found in system PATH!${NC}"
  echo "Please install Node.js (v18+ recommended)."
  exit 1
fi

echo -e "\n${YELLOW}Installation parameters:${NC}"
echo -e "  • Project directory: ${GREEN}$APP_DIR${NC}"
echo -e "  • Application port:  ${GREEN}$PORT${NC}"
echo -e "  • npm executable:    ${GREEN}$NPM_BIN${NC}"
echo -e "  • node executable:   ${GREEN}$NODE_BIN${NC}\n"

# 5. Build production bundle (if dist directory doesn't exist yet)
echo -e "${BLUE}[1/4] Checking application build...${NC}"
cd "$APP_DIR"

if [ ! -d "$APP_DIR/dist" ]; then
  echo -e "${YELLOW}Build directory 'dist' not found. Running 'npm run build'...${NC}"
  npm run build
  echo -e "${GREEN}Build completed successfully.${NC}"
else
  read -r -p "The 'dist' directory already exists. Rebuild from scratch? (y/N): " REBUILD
  if [[ "$REBUILD" =~ ^[Yy]$ ]]; then
    npm run build
    echo -e "${GREEN}Build successfully updated.${NC}"
  fi
fi

# 6. Create systemd unit file
SERVICE_FILE="/etc/systemd/system/choreo.service"
echo -e "${BLUE}[2/4] Creating systemd configuration: $SERVICE_FILE ...${NC}"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Choreo Puppet Management Dashboard
After=network.target puppetserver.service
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=PATH=$(dirname "$NODE_BIN"):$PATH
ExecStart=$NPM_BIN start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=choreo

# Security limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 7. Apply systemd changes
echo -e "${BLUE}[3/4] Registering and enabling service in systemd...${NC}"
systemctl daemon-reload
systemctl enable choreo.service

# 8. Start the service
echo -e "${BLUE}[4/4] Starting choreo service...${NC}"
systemctl restart choreo.service

# Allow a couple of seconds to initialize
sleep 2

# Check service status
if systemctl is-active --quiet choreo.service; then
  # Retrieve host IP address for user guidance
  HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  HOST_IP="${HOST_IP:-localhost}"

  echo -e "\n${GREEN}======================================================${NC}"
  echo -e "${GREEN}    Choreo service installed and started successfully! ${NC}"
  echo -e "${GREEN}======================================================${NC}"
  echo -e "The dashboard is available in your browser at:"
  echo -e "  👉  ${BLUE}http://${HOST_IP}:${PORT}${NC}\n"
  echo -e "Useful management commands:"
  echo -e "  • Status:      ${YELLOW}systemctl status choreo${NC}"
  echo -e "  • Restart:     ${YELLOW}systemctl restart choreo${NC}"
  echo -e "  • Stop:        ${YELLOW}systemctl stop choreo${NC}"
  echo -e "  • Live logs:   ${YELLOW}journalctl -u choreo -f${NC}"
  echo -e "======================================================\n"
else
  echo -e "\n${RED}[WARNING] Service registered, but failed to start.${NC}"
  echo -e "Check the error logs using:"
  echo -e "  ${YELLOW}journalctl -u choreo -n 30 --no-pager${NC}"
fi