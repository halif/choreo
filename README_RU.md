# 🎭 Choreo v2.5.0

> **Современная панель мониторинга и управления инфраструктурой Puppet в реальном времени**

[![Релиз](https://img.shields.io/badge/релиз-v2.5.0-amber.svg)](https://github.com/halif/choreo/releases)
[![Лицензия](https://img.shields.io/badge/лицензия-MIT-blue.svg)](LICENSE)
[![Puppet](https://img.shields.io/badge/puppet-7.x%20%7C%208.x-orange.svg)](https://puppet.com/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Tailwind-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-green.svg)](https://nodejs.org/)

[English version (README.md)](./README.md)

---

## 🌟 О проекте

**Choreo** — это легковесная, современная альтернатива Puppet Enterprise Console и PuppetBoard с открытым исходным кодом. Панель создана для системных администраторов и DevOps-инженеров, позволяя централизованно отслеживать состояние узлов Puppet Agent, выявлять дрейф конфигураций (configuration drift) и инициировать удалённые прогоны каталогов сразу в нескольких окружениях (`production`, `staging`, `development`).

Благодаря использованию шины событий Server-Sent Events (SSE) и вебхукам для отчётов, интерфейс моментально отображает результаты выполнения `puppet agent -t` без необходимости обновлять страницу вручную.

---

## ✨ Основные возможности

- 🖥️ **Инвентарь флота узлов:** Мониторинг актуального статуса (`В норме`, `Изменен`, `Сбой`, `Не отвечает`), FQDN, IP-адресов, версий ОС, привязанных классов и окружений.
- ⚡ **Запуск агента в один клик:** Удаленный запуск команды `puppet agent -t` на конкретном узле или массовый запуск по выбранным серверам/всему флоту.
- 📄 **Детальные отчеты Puppet:** Просмотр транзакционных отчетов Puppet, статистики ресурсов (без изменений / применены изменения / сбои), длительности выполнения и подробного журнала логов каталога.
- 🔄 **Шина событий реального времени (SSE):** Интеграция Server-Sent Events мгновенно сообщает в браузер о старте прогона, завершении работы агента и поступлении новых отчётов.
- 🏷️ **Группы узлов и классификация (ENC):** Удобная группировка узлов, распределение по окружениям и назначение Puppet-классов.
- 🛡️ **Автономность и простота развертывания:** Работает как на самом Puppet Master сервере, так и на отдельной выделенной виртуальной машине.

---

## 🏗️ Архитектура

```
[ Узлы Puppet Agent ]
        │
        │ 1. Применение каталога и генерация отчёта
        ▼
[ Puppet Server / Master ]
        │
        │ 2. Процессор отчётов отправляет Webhook (/api/webhook/report)
        ▼
┌────────────────────────────────────────────────────────┐
│                      CHOREO v2.5.0                     │
│                                                        │
│  [ Express API + SSE Bus ] ─── (порт 3000)             │
│            ▲                                           │
│            │ Состояние узлов и реестр отчётов          │
│            ▼                                           │
│  [ React SPA + Tailwind CSS + Lucide Icons ]           │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Быстрый старт

### 1. Требования к окружению
- Node.js (версии 18.x или 20.x+)
- npm или yarn
- Puppet Server 7.x или 8.x

### 2. Клонирование и установка

Клонируйте репозиторий:
```bash
git clone https://github.com/halif/choreo.git
cd choreo
```

Установите зависимости:
```bash
npm install
```

### 3. Сборка и запуск

**Продакшн режим (Production):**
```bash
# Сборка React фронтенда
npm run build

# Запуск сервера Node.js
npm run start
# Либо прямой запуск:
node server.ts
```

**Режим разработки с горячей перезагрузкой (Dev Mode):**
```bash
npm run dev
```

Интерфейс Choreo будет доступен по адресу: `http://<IP_ВАШЕГО_СЕРВЕРА>:3000`

---

## ⚙️ Настройка отправки отчетов с Puppet Server

Чтобы Puppet Server автоматически отправлял отчеты после каждого прогона агента в Choreo, настройте кастомный обработчик отчетов (report processor).

### Шаг 1: Создайте скрипт процессора отчетов
На сервере Puppet Master создайте файл `/etc/puppetlabs/code/environments/production/modules/choreo/lib/puppet/reports/choreo_report.rb`:

```ruby
require 'puppet'
require 'net/http'
require 'uri'
require 'json'

Puppet::Reports.register_report(:choreo) do
  desc "Отправка отчетов о прогонах Puppet в панель Choreo"

  def process
    # Укажите IP-адрес и порт вашего сервера Choreo
    uri = URI.parse("http://127.0.0.1:3000/api/webhook/report")
    payload = {
      certname: self.host,
      status: self.status,
      environment: self.environment,
      run_duration: self.metrics["time"]["total"] rescue 0.0,
      configuration_version: self.configuration_version,
      logs: self.logs.map { |l| { level: l.level.to_s, message: l.message, time: l.time.to_s } }
    }

    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
    request.body = payload.to_json
    http.request(request) rescue nil
  end
end
```

### Шаг 2: Включите процессор в `puppet.conf`
В файле `/etc/puppetlabs/puppet/puppet.conf` в секции `[master]` (или `[server]`):

```ini
[master]
reports = store, choreo
```

Перезапустите Puppet Server:
```bash
sudo systemctl restart puppetserver
```

---

## 📡 API интерфейсы

| Метод | Эндпоинт | Назначение |
|---|---|---|
| `GET` | `/api/metrics` | Общие метрики кластера, среднее время прогона и история за 24 часа |
| `GET` | `/api/nodes` | Список всех обнаруженных узлов Puppet |
| `GET` | `/api/reports` | Список последних транзакционных отчетов |
| `GET` | `/api/reports/:id` | Получение конкретного отчета с логами и метриками ресурсов |
| `POST` | `/api/webhook/report` | Вебхук для приема отчетов от Puppet Server |
| `POST` | `/api/run/:certname` | Инициация удаленного запуска `puppet agent -t` на узле |
| `GET` | `/api/events` | Поток событий в реальном времени (Server-Sent Events) |

---

## 🤝 Участие в разработке

Мы приветствуем любые идеи, исправления багов и улучшения функционала!
Вы можете открыть [Issue](https://github.com/halif/choreo/issues) или отправить [Pull Request](https://github.com/halif/choreo/pulls).

---

## 📝 Лицензия

Проект распространяется под свободной лицензией [MIT License](LICENSE).
