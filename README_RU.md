# 🎭 Choreo v2.6.0

> **Современная панель мониторинга и управления инфраструктурой Puppet в реальном времени**

[![Релиз](https://img.shields.io/badge/релиз-v2.6.0-amber.svg)](https://github.com/halif/choreo/releases)
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

### 1. Подготовка чистого сервера (Pre-requisites)
На абсолютно новом чистом сервере (Ubuntu/Debian, CentOS/AlmaLinux/RHEL) достаточно убедиться в наличии утилит `curl` и `git`:
```bash
# Для Ubuntu / Debian:
sudo apt-get update && sudo apt-get install -y curl git

# Для RHEL / CentOS / Rocky / AlmaLinux:
sudo dnf install -y curl git
```

---

### 2. Рекомендуемый способ: Установка в 1 клик через скрипт службы 🌟
Если вы разворачиваете Choreo на рабочем сервере как фоновую службу systemd, используйте встроенный скрипт автоматической установки. Он сам определит операционную систему, установит Node.js 20 LTS (если он отсутствует или устарел), соберет проект и запустит фоновую службу `choreo.service`:

```bash
git clone https://github.com/halif/choreo.git
cd choreo
bash install-service.sh
```

Управление службой:
```bash
sudo systemctl status choreo
sudo systemctl restart choreo
sudo journalctl -u choreo -f
```

---

### 3. Ручная установка и режим разработки (Dev Mode)

Если вы хотите запустить проект вручную или вести локальную разработку:

Клонируйте репозиторий:
```bash
git clone https://github.com/halif/choreo.git
cd choreo
```

Установите зависимости:
```bash
npm install
```

**Продакшн режим (Production):**
```bash
# Сборка React фронтенда
npm run build

# Запуск сервера Node.js
npm run start
# Либо прямой запуск:
node dist/server.cjs
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
На сервере Puppet Master создайте файл `/etc/puppetlabs/puppet/choreo_report.rb`:

```ruby
require 'puppet'
require 'net/http'
require 'uri'
require 'json'
require 'time'

Puppet::Reports.register_report(:choreo) do
  desc "Отправка отчетов о прогонах Puppet в панель Choreo"

  def process
    uri = URI.parse("http://127.0.0.1:3000/api/webhook/report")

    # 1. Безопасный подсчет и округление длительности (например 3.29s)
    total_time = 0.0
    if self.metrics && self.metrics['time']
      raw_time = self.metrics['time']['total'] || 0.0
      total_time = raw_time.to_f.round(2) rescue 0.0
    end

    # 2. Метрики ресурсов для карточек дашборда
    res_metrics = { total: 0, unchanged: 0, changed: 0, failed: 0, out_of_sync: 0 }
    if self.metrics && self.metrics['resources']
      res = self.metrics['resources']
      res_metrics[:total]       = (res['total'] || 0).to_i
      res_metrics[:unchanged]   = (res['unchanged'] || 0).to_i
      res_metrics[:changed]     = (res['changed'] || 0).to_i
      res_metrics[:failed]      = (res['failed'] || 0).to_i
      res_metrics[:out_of_sync] = (res['out_of_sync'] || 0).to_i
    end

    # 3. Формирование логов с обязательным валидным ISO-8601 временем
    formatted_logs = (self.logs || []).map do |l|
      log_time = nil
      if l.respond_to?(:time) && l.time
        log_time = l.time.respond_to?(:iso8601) ? l.time.iso8601 : l.time.to_s
      end
      log_time ||= Time.now.iso8601

      {
        level: l.level.to_s,
        message: l.message.to_s,
        source: (l.source || 'Puppet').to_s,
        time: log_time
      }
    end

    payload = {
      certname: self.host.to_s,
      status: self.status.to_s,
      environment: self.environment.to_s,
      puppetVersion: Puppet.version.to_s,
      configuration_version: self.configuration_version.to_s,
      run_duration: total_time,
      metrics: {
        time: { total: total_time },
        resources: res_metrics
      },
      logs: formatted_logs
    }

    http = Net::HTTP.new(uri.host, uri.port)
    http.read_timeout = 5
    http.open_timeout = 5

    request = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
    request.body = payload.to_json
    response = http.request(request)
    Puppet.info "Choreo report sent for #{self.host}: HTTP #{response.code}"
  rescue => e
    Puppet.err "Не удалось отправить отчет в Choreo: #{e.class} - #{e.message}"
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
