import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'ru';

export interface Translations {
  // Navigation
  navOverview: string;
  navNodes: string;
  navReports: string;
  navPerformance: string;
  navHealth: string;
  navGroups: string;

  // Header
  fleetRun: string;
  runningFleet: string;
  enrollNode: string;
  webhookSim: string;
  allEnvironments: string;
  liveConnected: string;
  liveOffline: string;

  // Statuses
  statusUnchanged: string;
  statusChanged: string;
  statusFailed: string;
  statusUnresponsive: string;
  statusPending: string;
  statusUnchangedDesc: string;
  statusChangedDesc: string;
  statusFailedDesc: string;
  statusUnresponsiveDesc: string;
  statusPendingDesc: string;

  // Overview KPI
  totalNodes: string;
  inSync: string;
  changed: string;
  changedNodes: string;
  failed: string;
  failedNodes: string;
  unresponsive: string;
  unresponsiveNodes: string;
  pending: string;
  avgRunTime: string;
  complianceRate: string;
  historyTimeline: string;
  fleetStatusDist: string;
  actionRequired: string;
  liveEventStream: string;
  noFailedNodes: string;
  loadingTelemetry: string;
  criticalAlertTitle: string;
  criticalAlertDesc: string;
  showFailedNodes: string;
  liveColNode: string;
  liveColStatus: string;
  liveColResource: string;
  liveColMessage: string;
  liveColTime: string;

  // Nodes View
  searchNodesPlaceholder: string;
  groupFilterLabel: string;
  allStatuses: string;
  allGroups: string;
  triggerRun: string;
  inspectNode: string;
  syncFacts: string;
  certname: string;
  ipAddress: string;
  osDistribution: string;
  classesAssigned: string;
  lastRunTime: string;
  duration: string;
  actions: string;
  selectedCount: string;
  runSelectedAgents: string;
  deleteSelected: string;
  noNodesFound: string;
  noNodesFoundDesc: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  noData: string;

  // Reports
  reportsTitle: string;
  searchReportsPlaceholder: string;
  viewReport: string;
  copyJsonReport: string;
  copiedJson: string;
  copyAllJson: string;
  catalogRevision: string;
  manifestVersion: string;
  resourceEvents: string;
  agentLogs: string;
  timingMetrics: string;
  rawJsonTab: string;
  close: string;
  environment: string;
  reportId: string;
  reportSummary: string;
  reportStatus: string;
  noReportsFound: string;

  // Performance
  perfTitle: string;
  perfSubtitle: string;
  avgRun: string;
  maxRun: string;
  minRun: string;
  failedRuns: string;
  durationTrends: string;
  timingBreakdown: string;
  topSlowest: string;
  timeWindowAll: string;
  timeWindow1h: string;
  timeWindow24h: string;
  timeWindow7d: string;

  // Server Health
  healthTitle: string;
  healthSubtitle: string;
  runningStatus: string;
  catalogMean: string;
  reportMean: string;
  totalMean: string;
  heapPercent: string;
  heapUsed: string;
  cpuPercent: string;
  jvmHeapUsage: string;
  jvmNonHeap: string;
  catalogRouteMean: string;
  reportSubmissionMean: string;
  refreshBtn: string;
  clearHistoryBtn: string;
  lastUpdated: string;
  pause: string;

  // Groups & Classes
  groupsTitle: string;
  groupsSubtitle: string;
  newGroupBtn: string;
  assignedClasses: string;
  memberNodes: string;
  noGroups: string;
  groupName: string;
  groupDesc: string;
  createGroupTitle: string;
  saveGroupBtn: string;

  // Node Detail Modal
  tabFacts: string;
  tabClasses: string;
  tabHistory: string;
  tabTerminal: string;
  searchFactsPlaceholder: string;
  addClassPlaceholder: string;
  addClassBtn: string;
  triggerAgentRunBtn: string;
  syncFactsNoticeSuccess: string;
  factsSyncing: string;

  // Modals & General
  cancel: string;
  save: string;
  enrollNodeTitle: string;
  webhookModalTitle: string;
  webhookModalSubtitle: string;
  copyConfig: string;
  copied: string;
  simulateReport: string;
  simulating: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    navOverview: 'Overview',
    navNodes: 'Nodes',
    navReports: 'Puppet Reports',
    navPerformance: 'Run Performance',
    navHealth: 'Server Health',
    navGroups: 'Groups & Classes',

    // Header
    fleetRun: 'Trigger Fleet Run',
    runningFleet: 'Running fleet...',
    enrollNode: 'Enroll Node',
    webhookSim: 'Webhook & Setup',
    allEnvironments: 'All Environments',
    liveConnected: 'LIVE SSE',
    liveOffline: 'Offline',

    // Statuses
    statusUnchanged: 'In Sync',
    statusChanged: 'Changed',
    statusFailed: 'Failed',
    statusUnresponsive: 'Unresponsive',
    statusPending: 'Pending',
    statusUnchangedDesc: 'Unchanged (In Sync)',
    statusChangedDesc: 'Changed (Applied)',
    statusFailedDesc: 'Failed (Catalog Error)',
    statusUnresponsiveDesc: 'Unresponsive (Offline)',
    statusPendingDesc: 'Pending (Queued)',

    // Overview KPI
    totalNodes: 'TOTAL NODES',
    inSync: 'IN SYNC',
    changed: 'CHANGED',
    changedNodes: 'Changed',
    failed: 'FAILED',
    failedNodes: 'Failed',
    unresponsive: 'UNRESPONSIVE',
    unresponsiveNodes: 'Unresponsive',
    pending: 'Pending',
    avgRunTime: 'AVG RUN TIME',
    complianceRate: 'Compliance Rate',
    historyTimeline: 'Puppet Run Dynamics (24 Hours)',
    fleetStatusDist: 'Fleet Status Distribution',
    actionRequired: 'Nodes Requiring Attention',
    liveEventStream: 'Puppet Live Stream (SSE)',
    noFailedNodes: 'All nodes are compliant with target catalog states (No failures).',
    loadingTelemetry: 'Loading Puppet telemetry...',
    criticalAlertTitle: 'Puppet configuration failures detected',
    criticalAlertDesc: 'Nodes failed to apply manifests due to service start errors or unavailable packages. Review reports and logs.',
    showFailedNodes: 'Show Failed Nodes',
    liveColNode: 'Node (FQDN)',
    liveColStatus: 'Status',
    liveColResource: 'Resource',
    liveColMessage: 'Event Message',
    liveColTime: 'Time',

    // Nodes View
    searchNodesPlaceholder: 'Search nodes by FQDN, IP, OS, or class...',
    groupFilterLabel: 'Group:',
    allStatuses: 'All Statuses',
    allGroups: 'All Groups',
    triggerRun: 'Run Agent',
    inspectNode: 'View Details',
    syncFacts: 'Sync Facts',
    certname: 'Node FQDN (Certname)',
    ipAddress: 'IP / OS',
    osDistribution: 'Operating System',
    classesAssigned: 'Assigned Classes',
    lastRunTime: 'Last Execution',
    duration: 'Duration',
    actions: 'Actions',
    selectedCount: 'Selected',
    runSelectedAgents: 'Run Agent on Selected',
    deleteSelected: 'Delete Selected',
    noNodesFound: 'No nodes found matching your filter criteria',
    noNodesFoundDesc: 'Try adjusting search query or clearing status filters.',
    justNow: 'just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    noData: 'no data',

    // Reports
    reportsTitle: 'Puppet Execution Reports',
    searchReportsPlaceholder: 'Search reports by FQDN, revision, or ID...',
    viewReport: 'View Report',
    copyJsonReport: 'Copy Raw JSON',
    copiedJson: 'JSON copied to clipboard!',
    copyAllJson: 'Copy Full JSON',
    catalogRevision: 'Catalog Revision',
    manifestVersion: 'Manifest Version',
    resourceEvents: 'Resource Events',
    agentLogs: 'Agent Logs',
    timingMetrics: 'Timing Metrics',
    rawJsonTab: 'Raw JSON',
    close: 'Close',
    environment: 'Environment',
    reportId: 'Report ID',
    reportSummary: 'Summary',
    reportStatus: 'Status',
    noReportsFound: 'No reports found matching your criteria',

    // Performance
    perfTitle: 'Run Performance & Timing Analytics',
    perfSubtitle: 'Catalog execution speeds, master compilation phases, and infrastructure bottleneck analysis',
    avgRun: 'Avg Run',
    maxRun: 'Max Run',
    minRun: 'Min Run',
    failedRuns: 'Failed Runs',
    durationTrends: 'Run Duration Trends',
    timingBreakdown: 'Timing Phase Breakdown',
    topSlowest: 'Top Slowest Nodes',
    timeWindowAll: 'All Time',
    timeWindow1h: '1 Hour',
    timeWindow24h: '24 Hours',
    timeWindow7d: '7 Days',

    // Server Health
    healthTitle: 'Puppet Master & Server Health',
    healthSubtitle: 'JVM telemetry, Garbage Collection cycles, and Puppet Server route latencies',
    runningStatus: 'RUNNING',
    catalogMean: 'Catalog mean (ms)',
    reportMean: 'Report mean (ms)',
    totalMean: 'Total mean (ms)',
    heapPercent: 'Heap %',
    heapUsed: 'Heap Used',
    cpuPercent: 'CPU %',
    jvmHeapUsage: 'JVM Heap Usage',
    jvmNonHeap: 'JVM Non-Heap (Metaspace)',
    catalogRouteMean: 'Catalog Route Mean (ms)',
    reportSubmissionMean: 'Report Submission Mean (ms)',
    refreshBtn: 'Refresh',
    clearHistoryBtn: 'Clear History',
    lastUpdated: 'Updated',
    pause: 'Pause',

    // Groups & Classes
    groupsTitle: 'Node Groups & Classification',
    groupsSubtitle: 'Organize nodes into logical tiers and assign Puppet classes dynamically',
    newGroupBtn: 'New Node Group',
    assignedClasses: 'Assigned Classes',
    memberNodes: 'Member Nodes',
    noGroups: 'No node groups created yet',
    groupName: 'Group Name',
    groupDesc: 'Description',
    createGroupTitle: 'Create Node Group',
    saveGroupBtn: 'Create Group',

    // Node Detail Modal
    tabFacts: 'Facts (Facter)',
    tabClasses: 'Classes',
    tabHistory: 'Run History',
    tabTerminal: 'Run Agent (Live)',
    searchFactsPlaceholder: 'Search facts by key or value...',
    addClassPlaceholder: 'Enter class name (e.g. profile::nginx)...',
    addClassBtn: 'Add Class',
    triggerAgentRunBtn: 'Trigger puppet agent -t',
    syncFactsNoticeSuccess: 'Facter facts synced successfully',
    factsSyncing: 'Syncing facts from node...',

    // Modals & General
    cancel: 'Cancel',
    save: 'Save',
    enrollNodeTitle: 'Enroll New Puppet Node',
    webhookModalTitle: 'Puppet Master Webhook & Report Integration',
    webhookModalSubtitle: 'Configure your Puppet Server to forward execution reports automatically to Choreo',
    copyConfig: 'Copy Snippet',
    copied: 'Copied!',
    simulateReport: 'Simulate Sample Report',
    simulating: 'Simulating...'
  },
  ru: {
    // Navigation
    navOverview: 'Сводка',
    navNodes: 'Узлы (Nodes)',
    navReports: 'Отчеты Puppet',
    navPerformance: 'Производительность',
    navHealth: 'Здоровье сервера',
    navGroups: 'Группы & Классы',

    // Header
    fleetRun: 'Запустить прогон флота',
    runningFleet: 'Запуск флота...',
    enrollNode: 'Добавить узел',
    webhookSim: 'Webhook & Настройка',
    allEnvironments: 'Все окружения',
    liveConnected: 'LIVE SSE',
    liveOffline: 'Offline',

    // Statuses
    statusUnchanged: 'В норме',
    statusChanged: 'Изменен',
    statusFailed: 'Сбой',
    statusUnresponsive: 'Не отвечает',
    statusPending: 'В ожидании',
    statusUnchangedDesc: 'Без изменений (В норме)',
    statusChangedDesc: 'Изменен (Применено)',
    statusFailedDesc: 'Сбой (Ошибка каталога)',
    statusUnresponsiveDesc: 'Не отвечает (Offline)',
    statusPendingDesc: 'В ожидании (Pending)',

    // Overview KPI
    totalNodes: 'ВСЕГО УЗЛОВ',
    inSync: 'В НОРМЕ',
    changed: 'ИЗМЕНЕНЫ',
    changedNodes: 'Изменены',
    failed: 'СБОИ',
    failedNodes: 'Сбои',
    unresponsive: 'НЕ ОТВЕЧАЮТ',
    unresponsiveNodes: 'Не отвечают',
    pending: 'Ожидают',
    avgRunTime: 'СР. ВРЕМЯ',
    complianceRate: 'Комплаенс',
    historyTimeline: 'Динамика прогонов Puppet (24 часа)',
    fleetStatusDist: 'Статусы узлов флота',
    actionRequired: 'Узлы, требующие внимания',
    liveEventStream: 'Лента событий Puppet (Live Stream)',
    noFailedNodes: 'Все узлы находятся в актуальном состоянии без зарегистрированных сбоев!',
    loadingTelemetry: 'Загрузка телеметрии Puppet...',
    criticalAlertTitle: 'Обнаружены сбои конфигурации Puppet',
    criticalAlertDesc: 'Узлы не смогли применить манифесты из-за ошибок запуска сервисов или недоступности пакетов. Рекомендуется проверить отчеты и логи.',
    showFailedNodes: 'Показать сбойные узлы',
    liveColNode: 'Узел (FQDN)',
    liveColStatus: 'Статус',
    liveColResource: 'Ресурс',
    liveColMessage: 'Событие / Сообщение',
    liveColTime: 'Время',

    // Nodes View
    searchNodesPlaceholder: 'Поиск по FQDN, IP, ОС или классу Puppet...',
    groupFilterLabel: 'Группа:',
    allStatuses: 'Все узлы',
    allGroups: 'Все группы',
    triggerRun: 'Запуск агента',
    inspectNode: 'Детали',
    syncFacts: 'Синхр. факты',
    certname: 'FQDN узла (Certname)',
    ipAddress: 'IP / ОС',
    osDistribution: 'Операционная система',
    classesAssigned: 'Назначенные классы',
    lastRunTime: 'Последний запуск',
    duration: 'Длительность',
    actions: 'Действия',
    selectedCount: 'Выбрано',
    runSelectedAgents: 'Запустить агент на выбранных',
    deleteSelected: 'Удалить выбранные',
    noNodesFound: 'Не найдено узлов, соответствующих фильтрам',
    noNodesFoundDesc: 'Попробуйте изменить поисковый запрос или сбросить фильтры.',
    justNow: 'только что',
    minutesAgo: 'мин назад',
    hoursAgo: 'ч назад',
    daysAgo: 'д назад',
    noData: 'нет данных',

    // Reports
    reportsTitle: 'Транзакционные отчеты Puppet',
    searchReportsPlaceholder: 'Поиск отчетов по FQDN, номеру ревизии или ID...',
    viewReport: 'Просмотр отчета',
    copyJsonReport: 'Скопировать JSON отчета',
    copiedJson: 'JSON скопирован в буфер обмена!',
    copyAllJson: 'Скопировать весь JSON',
    catalogRevision: 'Ревизия каталога',
    manifestVersion: 'Версия манифеста',
    resourceEvents: 'События ресурсов',
    agentLogs: 'Лог выполнения агента',
    timingMetrics: 'Время выполнения (Метрики)',
    rawJsonTab: 'JSON отчет',
    close: 'Закрыть',
    environment: 'Окружение',
    reportId: 'ID отчета',
    reportSummary: 'Сводка',
    reportStatus: 'Статус',
    noReportsFound: 'Отчеты, соответствующие критериям поиска, не найдены',

    // Performance
    perfTitle: 'Run Performance & Timing Analytics',
    perfSubtitle: 'Метрики скорости применения каталогов, фазы компиляции и выявление узких мест инфраструктуры',
    avgRun: 'Среднее время (Avg Run)',
    maxRun: 'Макс. прогон (Max Run)',
    minRun: 'Мин. прогон (Min Run)',
    failedRuns: 'Сбоев прогонов (Failed)',
    durationTrends: 'Run Duration Trends (Тренд длительности)',
    timingBreakdown: 'Timing Phase Breakdown (Разбивка по фазам)',
    topSlowest: 'Top Slowest Nodes (Самые медленные узлы)',
    timeWindowAll: 'Всё время',
    timeWindow1h: '1 час',
    timeWindow24h: '24 часа',
    timeWindow7d: '7 дней',

    // Server Health
    healthTitle: 'Puppet Master & Server Health',
    healthSubtitle: 'Телеметрия JVM, сборщика мусора и скорость обработки маршрутов Puppet Server',
    runningStatus: 'RUNNING',
    catalogMean: 'Catalog mean (ms)',
    reportMean: 'Report mean (ms)',
    totalMean: 'Total mean (ms)',
    heapPercent: 'Heap %',
    heapUsed: 'Heap Used',
    cpuPercent: 'CPU %',
    jvmHeapUsage: 'JVM Heap Usage',
    jvmNonHeap: 'JVM Non-Heap (Metaspace)',
    catalogRouteMean: 'Catalog Route Mean (ms)',
    reportSubmissionMean: 'Report Submission Mean (ms)',
    refreshBtn: 'Обновить',
    clearHistoryBtn: 'Очистить историю',
    lastUpdated: 'Обновлено',
    pause: 'Пауза',

    // Groups & Classes
    groupsTitle: 'Группы узлов и классификация',
    groupsSubtitle: 'Логическое разделение серверов по группам и динамическое назначение манифестов Puppet',
    newGroupBtn: 'Новая группа',
    assignedClasses: 'Назначенные классы',
    memberNodes: 'Узлы в группе',
    noGroups: 'Группы узлов ещё не созданы',
    groupName: 'Название группы',
    groupDesc: 'Описание',
    createGroupTitle: 'Создание группы узлов',
    saveGroupBtn: 'Создать группу',

    // Node Detail Modal
    tabFacts: 'Факты (Facter)',
    tabClasses: 'Классы',
    tabHistory: 'История прогонов',
    tabTerminal: 'Запуск агента (Live)',
    searchFactsPlaceholder: 'Поиск по фактам Facter...',
    addClassPlaceholder: 'Введите имя класса (например, profile::nginx)...',
    addClassBtn: 'Добавить класс',
    triggerAgentRunBtn: 'Запустить puppet agent -t',
    syncFactsNoticeSuccess: 'Факты Facter успешно синхронизированы',
    factsSyncing: 'Синхронизация фактов с узла...',

    // Modals & General
    cancel: 'Отмена',
    save: 'Сохранить',
    enrollNodeTitle: 'Регистрация нового узла Puppet',
    webhookModalTitle: 'Настройка интеграции Webhook Puppet Master',
    webhookModalSubtitle: 'Настройте Puppet Server для автоматической отправки отчетов о прогонах в Choreo Dashboard',
    copyConfig: 'Скопировать фрагмент',
    copied: 'Скопировано!',
    simulateReport: 'Смоделировать тестовый отчет',
    simulating: 'Отправка...'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('choreo_lang', lang);
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return ctx;
};
