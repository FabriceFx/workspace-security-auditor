/**
 * ============================================================
 * Menu.gs — Menu principal & points d'entrée UI
 * ============================================================
 */

/**
 * Crée le menu "Workspace Audit" à l'ouverture du Spreadsheet.
 */
function onOpen() {
  buildMenu();
}

/**
 * Reconstruit le menu (utile après changement de langue).
 */
function buildMenu() {
  const tr = t();
  const ui = SpreadsheetApp.getUi();

  ui.createMenu(tr.menu_title)
    .addItem(tr.menu_refresh_dash, 'runDashboard')
    .addItem(tr.menu_open_panel,   'showSidebar')
    .addSeparator()
    .addSubMenu(
      ui.createMenu(tr.menu_audit)
        .addItem(tr.menu_users,    'runAuditUsers')
        .addItem(tr.menu_groups,   'runAuditGroups')
        .addItem(tr.menu_drive,    'runAuditDrive')
        .addItem(tr.menu_security, 'runAuditSecurity')
        .addItem(tr.menu_logs,     'runAuditLogs')
        .addItem(tr.menu_login,    'runAuditLogin')
        .addItem(tr.menu_devices,  'runAuditDevices')
        .addItem(tr.menu_dns,      'runAuditDNS')
    )
    .addSeparator()
    .addItem(tr.menu_config,        'showConfigDialog')
    .addItem(tr.menu_scheduler,     'showSchedulerDialog')
    .addItem(tr.menu_stop_scheduler,'stopScheduledReports')
    .addSeparator()
    .addItem(tr.menu_about,         'showAbout')
    .addToUi();
}

/**
 * Ouvre le panneau latéral de contrôle.
 */
function showSidebar() {
  const html = HtmlService
    .createTemplateFromFile('Sidebar').evaluate()
    .setTitle(t().menu_title)
    .setWidth(340);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Affiche la boîte de dialogue de configuration.
 */
function showConfigDialog() {
  const tr = t();
  const props = PropertiesService.getScriptProperties();

  const domains = getDomains().join(', ');
  const lang    = getLang();
  const emails  = getReportEmails().join(', ');
  const schedDay  = props.getProperty(PROP_SCHED_DAY)  || DEFAULT_SCHED_DAY;
  const schedHour = props.getProperty(PROP_SCHED_HOUR) || DEFAULT_SCHED_HOUR;

  const html = HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<base target="_top">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">
${HtmlService.createHtmlOutputFromFile('Styles').getContent()}
</head>
<body>

<div class="block form-group">
  <label for="domains" class="gw-label">${tr.cfg_domains}</label>
  <input id="domains" class="gw-input" type="text" value="${domains}" placeholder="* ou example.com, company.org">
</div>

<div class="block form-group">
  <label for="lang" class="gw-label">${tr.cfg_lang}</label>
  <select id="lang" class="gw-input">
    <option value="fr" ${lang === 'fr' ? 'selected' : ''}>🇫🇷 Français</option>
    <option value="en" ${lang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
  </select>
</div>

<div class="block form-group">
  <label for="emails" class="gw-label">${tr.cfg_emails}</label>
  <input id="emails" class="gw-input" type="text" value="${emails}" placeholder="admin@company.com">
</div>

<div class="row2">
  <div class="block form-group">
    <label for="schedDay" class="gw-label">${tr.cfg_sched_day}</label>
    <select id="schedDay" class="gw-input">
      ${tr.days.map((d, i) => `<option value="${i}" ${i == schedDay ? 'selected' : ''}>${d}</option>`).join('')}
    </select>
  </div>
  <div class="block form-group">
    <label for="schedHour" class="gw-label">${tr.cfg_sched_hour}</label>
    <input id="schedHour" class="gw-input" type="number" min="0" max="23" value="${schedHour}">
  </div>
</div>

<div class="success-msg" id="msg">
  <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">check_circle</span>
  ${tr.cfg_saved}
</div>

<div class="footer-actions">
  <button class="gw-btn gw-btn-secondary" onclick="google.script.host.close()">${lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
  <button class="gw-btn gw-btn-primary" id="btnSave" onclick="save()">${tr.cfg_save}</button>
</div>

<script>
function save() {
  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  const data = {
    domains:   document.getElementById('domains').value,
    lang:      document.getElementById('lang').value,
    emails:    document.getElementById('emails').value,
    schedDay:  document.getElementById('schedDay').value,
    schedHour: document.getElementById('schedHour').value,
  };
  google.script.run
    .withSuccessHandler(() => {
      document.getElementById('msg').style.display = 'block';
      setTimeout(() => google.script.host.close(), 1500);
    })
    .withFailureHandler(err => { btn.disabled = false; alert(err.message); })
    .saveConfig(data);
}
<\/script>
</body>
</html>`)
    .setWidth(440).setHeight(480);

  SpreadsheetApp.getUi().showModalDialog(html, tr.cfg_title);
}

/**
 * Sauvegarde la configuration depuis le dialog HTML.
 * @param {Object} data
 */
function saveConfig(data) {
  const props = PropertiesService.getScriptProperties();

  // Domaines
  const domains = data.domains.split(',').map(d => d.trim()).filter(Boolean);
  saveDomains(domains);

  // Langue
  if (data.lang === 'fr' || data.lang === 'en') {
    props.setProperty(PROP_LANG, data.lang);
  }

  // Emails
  const emails = data.emails.split(',').map(e => e.trim()).filter(Boolean);
  props.setProperty(PROP_EMAIL, JSON.stringify(emails));

  // Planification
  props.setProperty(PROP_SCHED_DAY,  String(parseInt(data.schedDay)));
  props.setProperty(PROP_SCHED_HOUR, String(parseInt(data.schedHour)));

  // Reconstruit le menu avec la nouvelle langue
  buildMenu();
}

/**
 * Affiche le dialog de planification des rapports.
 */
function showSchedulerDialog() {
  const tr = t();
  const lang = getLang();
  const props = PropertiesService.getScriptProperties();
  const existingTrigger = props.getProperty(PROP_TRIGGER_ID);
  const schedDay  = props.getProperty(PROP_SCHED_DAY)  || DEFAULT_SCHED_DAY;
  const schedHour = props.getProperty(PROP_SCHED_HOUR) || DEFAULT_SCHED_HOUR;
  const dayName   = tr.days[parseInt(schedDay)];

  const status = existingTrigger
    ? (lang === 'fr'
        ? `✅ Rapport actif : chaque ${dayName} à ${schedHour}h`
        : `✅ Active: every ${dayName} at ${schedHour}:00`)
    : (lang === 'fr' ? '⚠️ Aucun rapport planifié' : '⚠️ No scheduled report');

  const btnLabel = lang === 'fr' ? '▶ Activer le rapport hebdomadaire' : '▶ Enable Weekly Report';

  const html = HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<base target="_top">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">
${HtmlService.createHtmlOutputFromFile('Styles').getContent()}
</head>
<body>

<div class="status-card">
  <span class="material-symbols-outlined" style="color:${existingTrigger ? '#137333' : '#b06000'}">${existingTrigger ? 'task_alt' : 'schedule'}</span>
  ${status}
</div>

<p>${lang === 'fr' ? 'Configurez le jour et l\'heure dans ⚙️ Configuration, puis activez le rapport.' : 'Set the day and time in ⚙️ Configuration, then enable the report.'}</p>

<div class="feedback" id="feedback"></div>

<div class="footer-actions">
  <button class="gw-btn gw-btn-secondary" onclick="google.script.host.close()">${lang === 'fr' ? 'Fermer' : 'Close'}</button>
  <button class="gw-btn gw-btn-primary" id="btnEnable" onclick="enable()">${btnLabel}</button>
</div>

<script>
function enable() {
  const btn = document.getElementById('btnEnable');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>${lang === 'fr' ? 'Activation...' : 'Activating...'}';
  google.script.run
    .withSuccessHandler(() => {
      const fb = document.getElementById('feedback');
      fb.className = 'feedback ok';
      fb.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">check_circle</span> ${lang === 'fr' ? 'Rapport hebdomadaire activé !' : 'Weekly report enabled!'}';
      fb.style.display = 'block';
      btn.style.display = 'none';
      setTimeout(() => google.script.host.close(), 2000);
    })
    .withFailureHandler(err => {
      btn.disabled = false;
      btn.innerHTML = '${btnLabel}';
      const fb = document.getElementById('feedback');
      fb.className = 'feedback error';
      fb.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">error</span> ' + err.message;
      fb.style.display = 'block';
    })
    .enableWeeklyReport();
}
<\/script>
</body>
</html>`).setWidth(400).setHeight(320);

  SpreadsheetApp.getUi().showModalDialog(html, tr.menu_scheduler);
}

/**
 * Affiche la boîte "À propos".
 */
function showAbout() {
  const lang = getLang();
  const msg = lang === 'fr'
    ? '🔍 Workspace Audit v1.0\n\nOutil d\'audit de sécurité Google Workspace\ndéveloppé en Apps Script.\n\nMódules : Utilisateurs · Groupes · Drive\nSécurité · Logs · Connexions · Appareils\n\n© 2024 — Multi-domaine · Bilangue'
    : '🔍 Workspace Audit v1.0\n\nGoogle Workspace security audit tool\nbuilt with Apps Script.\n\nModules: Users · Groups · Drive\nSecurity · Logs · Login · Devices\n\n© 2024 — Multi-domain · Bilingual';
  SpreadsheetApp.getUi().alert(msg);
}

// ── Points d'entrée des modules d'audit ──────────────────────
// Note : runAuditDrive() est défini dans AuditDrive.gs (ouvre le dialog de filtre)

function runAuditUsers()    { auditUsers(); }
function runAuditGroups()   { auditGroups(); }
function runAuditSecurity() { auditSecurity(); }
function runAuditLogs()     { auditLogs(); }
function runAuditLogin()    { auditLoginActivity(); }
function runAuditDevices()  { auditDevices(); }
function runAuditDNS()      { auditDNS(); }
function runAuditAlerts()   { auditAlerts(); }

/**
 * Retourne les données nécessaires à l'initialisation de la Sidebar.
 * Appelé via google.script.run.getSidebarData() depuis Sidebar.html.
 * @param {boolean} rebuildDashboard - Si true, reconstruit le tableau de bord et l'active
 * @returns {{lang: string, domains: string[], metrics: Object}}
 */
function getSidebarData(rebuildDashboard = false) {
  // Compile les métriques agrégées depuis le cache des modules
  const mUsers    = _getMetrics('users');
  const mGroups   = _getMetrics('groups');
  const mDrive    = _getMetrics('drive');
  const mSecurity = _getMetrics('security');
  const mLogin    = _getMetrics('login');
  const mDevices  = _getMetrics('devices');
  const mDNS      = _getMetrics('dns');
  const mAlerts   = _getMetrics('alerts');

  if (rebuildDashboard) {
    try {
      _buildDashboard(getSS(), t(), { mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices, mDNS, mAlerts });
      moveDashboardFirst(getSS());
    } catch(e) { logError('getSidebarData-buildDashboard', e); }
  }

  const metrics = {
    totalUsers    : mUsers.totalUsers     || 0,
    inactiveUsers : mUsers.inactiveUsers  || 0,
    no2faUsers    : mUsers.no2faUsers     || 0,
    suspendedUsers: mUsers.suspendedUsers || 0,
    externalShares: mDrive.externalShares || 0,
    publicFiles   : mDrive.publicFiles    || 0,
    oauthApps     : mSecurity.oauthApps   || 0,
    failedLogins  : mLogin.failedLogins   || 0,
    totalDevices  : mDevices.totalDevices || 0,
    nonCompliant  : mDevices.nonCompliant || 0,
    highSeverityAlerts: mAlerts.highSeverity || 0,
  };

  return {
    lang    : getLang(),
    domains : getDomains(),
    metrics : metrics,
  };
}
