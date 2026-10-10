# 🎭 Choreo v2.6.5

> **Современная панель мониторинга и управления инфраструктурой Puppet в реальном времени**

[![CI/CD Pipeline](https://github.com/halif/choreo/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/halif/choreo/actions/workflows/ci-cd.yml)
[![Релиз](https://img.shields.io/badge/релиз-v2.6.5-amber.svg)](https://github.com/halif/choreo/releases)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue.svg)](https://github.com/halif/choreo/pkgs/container/choreo)
[![Лицензия](https://img.shields.io/badge/лицензия-MIT-blue.svg)](LICENSE)
[![Puppet](https://img.shields.io/badge/puppet-7.x%20%7C%208.x-orange.svg)](https://puppet.com/)
[![React](https://img.shields.io/badge/frontend-React%2019%20%2B%20Tailwind-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-green.svg)](https://nodejs.org/)

[English version (README.md)](./README.md)

---

## 🌟 О проекте

**Choreo** — это легковесная, современная альтернатива Puppet Enterprise Console и PuppetBoard с открытым исходным кодом. Панель создана для системных администраторов и DevOps-инженеров, позволяя централизованно отслеживать состояние узлов Puppet Agent, выявлять дрейф конфигураций (configuration drift) и инициировать удалённые прогоны каталогов сразу в нескольких окружениях (`production`, `staging`, `development`).

Благодаря использованию шины событий Server-Sent Events (SSE), автоматической синхронизации системных фактов Facter и вебхукам для отчётов, интерфейс моментально отображает результаты выполнения `puppet agent -t` без необходимости обновлять страницу вручную.

---

## ✨ Основные возможности

- 🖥️ **Инвентарь флота узлов:** Мониторинг актуального статуса (`В норме`, `Изменен`, `Сбой`, `Не отвечает`), FQDN, IP-адресов, версий ОС, привязанных классов и окружений.
- ⚡ **Запуск агента в один клик:** Удаленный запуск команды `puppet agent -t` на конкретном узле или массовый запуск по выбранным серверам/всему флоту.
- 🔍 **Нативная поддержка Facter 4 & Синхронизация фактов:** Приём структурированных фактов (`facter -p --json`), автоматическое распознавание ОС, сетевых адресов и железа.
- 📄 **Детальные отчеты Puppet:** Просмотр транзакционных отчетов Puppet, статистики ресурсов (без изменений / применены изменения / сбои), времени выполнения, диффов и логов.
- 📋 **Удобный экспорт отчетов в JSON:** Копирование сырого JSON отчета в один клик с поддержкой надежного резервного копирования для HTTP-соединений.
- 🔄 **Шина событий реального времени (SSE):** Интеграция Server-Sent Events мгновенно сообщает в браузер о старте прогона, завершении работы агента и поступлении новых отчётов.
- 🏷️ **Группы узлов и классификация (ENC):** Удобная группировка узлов, распределение по окружениям и назначение Puppet-классов.
- 🐳 **Готовность к Docker и CI/CD:** Автоматизированный пайплайн GitHub Actions с автоматической публикацией образов в GitHub Container Registry (GHCR).

---

## 🏗️ Архитектура

```
[ Узлы Puppet Agent ]
        │
        │ 1. Применение каталога и генерация отчёта / факты Facter
        ▼
[ Puppet Server / Master ]
        │
        │ 2. Процессор отчётов отправляет Webhook (/api/reports)
        ▼
┌────────────────────────────────────────────────────────┐
│                      CHOREO v2.6.1                     │
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

### Вариант А: Запуск через Docker (Самый быстрый) 🐳

Choreo собирается автоматически и публикуется в GitHub Container Registry:

```bash
docker run -d \
  --name choreo \
  -p 3000:3000 \
  --restart always \
  ghcr.io/halif/choreo:latest
```

Откройте в браузере: `http://<IP_СЕРВЕРА>:3000`.

---

### Вариант Б: Автоматическая установка как Systemd сервис 🌟
Если вы разворачиваете Choreo на чистом Linux сервере (Ubuntu/Debian, CentOS/AlmaLinux/RHEL):

```bash
git clone https://github.com/halif/choreo.git
cd choreo
bash install-service.sh
```

Управление сервисом:
```bash
sudo systemctl status choreo
sudo systemctl restart choreo
sudo journalctl -u choreo -f
```

---

### Вариант В: Ручная установка и режим разработки

```bash
git clone https://github.com/halif/choreo.git
cd choreo
npm install

# Продакшен-сборка и запуск:
npm run build
npm start

# Режим разработки (с горячей перезагрузкой):
npm run dev
```

Интерфейс Choreo будет доступен по адресу: `http://<IP_СЕРВЕРА>:3000`.

---

## ⚙️ Настройка Webhook в Puppet Server

Чтобы Puppet Server автоматически отправлял отчеты после каждого запуска агента, настройте процессор отчетов:

### Шаг 1: Создайте скрипт процессора отчетов
На Puppet Server создайте файл `/etc/puppetlabs/puppet/choreo_report.rb`:

```ruby
require 'puppet'
require 'net/http'
require 'uri'
require 'json'
require 'time'

Puppet::Reports.register_report(:choreo) do
  desc "Send Puppet run reports to Choreo dashboard"

  def process
    uri = URI.parse("http://192.168.1.9:3000/api/reports")
    total_time = self.metrics['time'] && self.metrics['time']['total'] ? self.metrics['time']['total'].round(2) : 0.0

    res_metrics = {
      total: self.resource_statuses.size,
      unchanged: self.resource_statuses.values.count { |r| !r.changed && !r.failed },
      changed: self.resource_statuses.values.count { |r| r.changed && !r.failed },
      failed: self.resource_statuses.values.count { |r| r.failed },
      out_of_sync: self.resource_statuses.values.count { |r| r.out_of_sync }
    }

    formatted_logs = self.logs.map do |log|
      {
        level: log.level.to_s,
        message: log.message.to_s,
        source: log.source.to_s,
        time: log.time.iso8601
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
    Puppet.err "Failed to send report to Choreo: #{e.class} - #{e.message}"
  end
end
```

### Шаг 2: Включите репорт в `puppet.conf`
В файле `/etc/puppetlabs/puppet/puppet.conf` в блоке `[master]` или `[server]`:

```ini
[master]
reports = store, choreo
```

Перезапустите Puppet Server:
```bash
sudo systemctl restart puppetserver
```

---

## 💻 Синхронизация фактов узла (Facter)

Чтобы отправить свежие системные факты и характеристики узла в Choreo:

```bash
facter -p --json | curl -X POST http://<CHOREO_IP>:3000/api/nodes/<CERTNAME>/facts \
  -H "Content-Type: application/json" \
  -d @-
```
Либо нажмите кнопку **«Синхронизировать факты»** прямо в модальном окне узла в веб-интерфейсе.

---

## 📡 API Эндпоинты

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/api/metrics` | Метрики состояния флота, среднее время прогона и таймлайн |
| `GET` | `/api/nodes` | Список всех обнаруженных Puppet узлов |
| `GET` | `/api/nodes/:certname` | Детальная информация об узле, факты и история |
| `POST` | `/api/nodes/:certname/facts` | Приём структурированных JSON-фактов Facter |
| `POST` | `/api/nodes/:certname/sync-facts` | Запуск локального facter и обновление телеметрии |
| `GET` | `/api/reports` | Список недавних транзакционных отчетов Puppet |
| `GET` | `/api/reports/:id` | Детальный отчет, журнал логов и метрики ресурсов |
| `POST` | `/api/reports` | Приём отчёта Puppet Server через Webhook |
| `POST` | `/api/run/:certname` | Удаленный запуск `puppet agent -t` на узле |
| `GET` | `/api/events` | Поток событий в реальном времени Server-Sent Events (SSE) |

---

## 🔄 CI/CD Пайплайн

В проекте настроен пайплайн автоматической непрерывной интеграции и доставки (GitHub Actions `.github/workflows/ci-cd.yml`):
- **Lint & Build:** Проверка статической типизации TypeScript (`tsc --noEmit`) и компиляция.
- **Docker Build & Push:** Автоматическая сборка Multi-stage Docker-образа и публикация в **GHCR** (`ghcr.io/halif/choreo`).
- **Автодеплой:** Опциональное обновление сервиса по SSH на Puppet Master хосте без простоев.

---

## 🤝 Участие в разработке

Будем рады вашим предложениям, отчетам об ошибках и Pull Request'ам!
Создавайте [Issue](https://github.com/halif/choreo/issues) или присылайте [Pull Request](https://github.com/halif/choreo/pulls).

---

## 📝 Лицензия

Проект распространяется под свободной лицензией [MIT License](LICENSE).
