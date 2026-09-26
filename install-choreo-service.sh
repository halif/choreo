#!/bin/bash
# ==============================================================================
# Choreo Dashboard - Автоматический инсталлятор системной службы (systemd)
# ==============================================================================
set -e

# Цвета для красивого вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}      Choreo Puppet Dashboard - Установка службы      ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Проверка прав root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ОШИБКА] Пожалуйста, запустите скрипт с правами root или через sudo:${NC}"
  echo -e "  sudo $0"
  exit 1
fi

# 2. Определение рабочей директории приложения
# По умолчанию берется текущая директория, где лежит скрипт
DEFAULT_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
read -r -p "Путь к каталогу Choreo [по умолчанию: $DEFAULT_APP_DIR]: " INPUT_APP_DIR
APP_DIR="${INPUT_APP_DIR:-$DEFAULT_APP_DIR}"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${RED}[ОШИБКА] В директории $APP_DIR не найден package.json!${NC}"
  echo "Убедитесь, что указали правильный путь к проекту Choreo."
  exit 1
fi

# 3. Выбор порта
DEFAULT_PORT="3000"
read -r -p "Порт для запуска Choreo [по умолчанию: $DEFAULT_PORT]: " INPUT_PORT
PORT="${INPUT_PORT:-$DEFAULT_PORT}"

# 4. Поиск путей к node и npm
NODE_BIN=$(which node 2>/dev/null || true)
NPM_BIN=$(which npm 2>/dev/null || true)

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  echo -e "${RED}[ОШИБКА] Node.js или npm не найдены в системе PATH!${NC}"
  echo "Пожалуйста, установите Node.js (рекомендуется v18+)."
  exit 1
fi

echo -e "\n${YELLOW}Параметры установки:${NC}"
echo -e "  • Каталог проекта: ${GREEN}$APP_DIR${NC}"
echo -e "  • Порт приложения: ${GREEN}$PORT${NC}"
echo -e "  • Исполняемый npm:  ${GREEN}$NPM_BIN${NC}"
echo -e "  • Исполняемый node: ${GREEN}$NODE_BIN${NC}\n"

# 5. Сборка production-билда (если еще не собран dist)
echo -e "${BLUE}[1/4] Проверка сборки приложения...${NC}"
cd "$APP_DIR"

if [ ! -d "$APP_DIR/dist" ]; then
  echo -e "${YELLOW}Сборка dist не найдена. Запускаем 'npm run build'...${NC}"
  npm run build
  echo -e "${GREEN}Сборка успешно завершена.${NC}"
else
  read -r -p "Каталог dist уже существует. Пересобрать заново? (y/N): " REBUILD
  if [[ "$REBUILD" =~ ^[Yy]$ ]]; then
    npm run build
    echo -e "${GREEN}Сборка успешно обновлена.${NC}"
  fi
fi

# 6. Создание unit-файла systemd
SERVICE_FILE="/etc/systemd/system/choreo.service"
echo -e "${BLUE}[2/4] Создание конфигурации systemd: $SERVICE_FILE ...${NC}"

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

# Ограничения безопасности
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 7. Применение изменений в systemd
echo -e "${BLUE}[3/4] Регистрация и активация службы в systemd...${NC}"
systemctl daemon-reload
systemctl enable choreo.service

# 8. Запуск службы
echo -e "${BLUE}[4/4] Запуск службы choreo...${NC}"
systemctl restart choreo.service

# Даем пару секунд на старт
sleep 2

# Проверяем статус
if systemctl is-active --quiet choreo.service; then
  # Получаем IP-адрес хоста для подсказки
  HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  HOST_IP="${HOST_IP:-localhost}"

  echo -e "\n${GREEN}======================================================${NC}"
  echo -e "${GREEN}       Служба Choreo успешно установлена и запущена!   ${NC}"
  echo -e "${GREEN}======================================================${NC}"
  echo -e "Дашборд доступен в браузере по адресу:"
  echo -e "  👉  ${BLUE}http://${HOST_IP}:${PORT}${NC}\n"
  echo -e "Полезные команды для управления службой:"
  echo -e "  • Статус:      ${YELLOW}systemctl status choreo${NC}"
  echo -e "  • Перезапуск:  ${YELLOW}systemctl restart choreo${NC}"
  echo -e "  • Остановка:   ${YELLOW}systemctl stop choreo${NC}"
  echo -e "  • Логи онлайн: ${YELLOW}journalctl -u choreo -f${NC}"
  echo -e "======================================================\n"
else
  echo -e "\n${RED}[ВНИМАНИЕ] Служба зарегистрирована, но не смогла запуститься.${NC}"
  echo -e "Посмотрите журнал ошибок командой:"
  echo -e "  ${YELLOW}journalctl -u choreo -n 30 --no-pager${NC}"
fi