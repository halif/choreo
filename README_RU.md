# Choreo v2.4 — Puppet Orchestration & Node Management Dashboard

Choreo — это современная панель управления и мониторинга инфраструктуры Puppet. Панель позволяет в реальном времени отслеживать состояние флота узлов, просматривать отчёты применения каталогов, классифицировать ноды по группам и запускать прогоны `puppet agent -t` в один клик.

---

## 🚀 Основные возможности

- **Мониторинг узлов (Fleet Overview & Nodes)**:
    - Автоматическое обнаружение локального Puppet Master и управляемых агентов.
    - Мгновенный статус конфигурации: *В норме*, *Сбои (Failed)*, *Изменены (Changed)*, *Дрифт конфигурации (Drift)*.
    - Детальные сведения об узле: FQDN, IP-адрес, окружение (`production`), версия Puppet-агента, аппаратные ресурсы (vCPU, RAM).
- **Оркестрация и запуск агентов (`puppet agent -t`)**:
    - Асинхронный запуск `puppet agent -t` на конкретном узле прямо из интерфейса.
    - Массовый запуск прогона конфигурации на всём флоте узлов (Batch Run).
    - Отсутствие блокировки интерфейса и сокетов (фоновое выполнение через системные команды).
- **Сбор и анализ отчётов Puppet (Reports)**:
    - Приём структурированных отчётов через HTTP Webhook (`/api/webhook/report` и `/api/reports`).
    - Детальный просмотр статуса ресурсов, времени компиляции каталога и логов выполнения.
- **Группы и классификация (Node Classification)**:
    - Создание групп узлов и сопоставление их с классами Puppet.
- **События в реальном времени (Live Events via SSE)**:
    - Мгновенные уведомления о статусе прогонов и изменении состояния узлов через Server-Sent Events.

---

## 🛠 Технологический стек

- **Фронтенд**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Бэкенд**: Express.js (Node.js), TypeScript (`tsx`), Server-Sent Events (SSE).
- **Сборка и среда**: Vite 6, esbuild.
- **Инфраструктура**: Linux, Puppet Server 7/8, Puppet Agent CLI.

---

## 📋 Требования к окружению

- **Node.js**: версии 18.x или новее.
- **Puppet Agent / Server**: установленный в `/opt/puppetlabs/bin/puppet`.
- **Sudo-права**: для выполнения команды запуска агента от имени пользователя приложения без ввода пароля:
  ```bash
  # Добавьте в /etc/sudoers или /etc/sudoers.d/puppet-agent
  <YOUR_USER> ALL=(ALL) NOPASSWD: /opt/puppetlabs/bin/puppet agent -t
  ```

---

## ⚙️ Установка и запуск

### 1. Клонирование и установка зависимостей
```bash
git clone <URL_РЕПОЗИТОРИЯ> choreo
cd choreo
npm install
```

### 2. Запуск в режиме разработки (Dev)
```bash
npm run dev
```
Интерфейс будет доступен по адресу:  
👉 **http://localhost:3000** (или `http://<IP_СЕРВЕРА>:3000`)

### 3. Сборка и запуск в Production
```bash
# Сборка статических файлов фронтенда и сервера
npm run build

# Запуск скомпилированного сервера
npm start
```

---

## 📡 Примеры использования API

### 1. Получение метрик и хоста Puppet Master
```bash
curl -X GET http://localhost:3000/api/metrics
```
**Пример ответа:**
```json
{
  "puppetMasterHost": "kubenode1:8140",
  "totalNodes": 1,
  "healthyNodes": 1,
  "failedNodes": 0,
  "driftNodes": 0
}
```

### 2. Получение списка узлов
```bash
curl -X GET http://localhost:3000/api/nodes
```
**Пример ответа:**
```json
[
  {
    "certname": "kubenode1",
    "ip": "127.0.0.1",
    "environment": "production",
    "status": "unchanged",
    "agentVersion": "7.34.0"
  }
]
```

### 3. Запуск Puppet Agent на узле
Запускает неблокирующий фоновый прогон `puppet agent -t` на указанном узле:
```bash
curl -i -X POST http://localhost:3000/api/nodes/kubenode1/run \
  -H "Content-Type: application/json" \
  -d '{"forcedOutcome": "success"}'
```
**Пример ответа:**
```json
{
  "success": true,
  "message": "Puppet run started for kubenode1"
}
```

### 4. Отправка отчёта о прогоне через Webhook
```bash
curl -X POST http://localhost:3000/api/webhook/report \
  -H "Content-Type: application/json" \
  -d '{
    "certname": "kubenode1",
    "status": "unchanged",
    "environment": "production",
    "metrics": {
      "total_time": 2.45,
      "resources_changed": 0,
      "resources_failed": 0
    },
    "logs": [
      { "level": "notice", "message": "Applied catalog in 2.45 seconds" }
    ]
  }'
```

### 5. Подписка на поток событий (SSE)
```bash
curl -N -X GET http://localhost:3000/api/events
```
**Пример событий:**
```text
data: {"type":"node_run_started","certname":"kubenode1","message":"Triggered puppet agent -t on kubenode1","timestamp":"2026-09-19T02:46:37.000Z"}
```

---

## 📁 Структура проекта

```text
choreo/
├── server.ts             # Express.js сервер, маршрутизация API, интеграция с Puppet CLI
├── src/
│   ├── App.tsx           # Главный компонент интерфейса и логика приложения
│   ├── components/       # Компоненты UI (Header, NodesView, Reports, Groups, Modals)
│   ├── services/
│   │   └── api.ts        # Клиентский слой взаимодействия с API (fetch, SSE)
│   ├── types.ts          # Интерфейсы и типы данных TypeScript
│   └── main.tsx          # Точка входа React
├── package.json          # Зависимости и скрипты сборки
├── vite.config.ts        # Конфигурация Vite
└── README.md             # Документация проекта
```

---

## 📄 Лицензия

MIT