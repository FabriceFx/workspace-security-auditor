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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<style>
  :root {
    --primary: #4F46E5;
    --primary-hover: #4338CA;
    --bg: #F9FAFB;
    --surface: #FFFFFF;
    --text-main: #111827;
    --text-muted: #6B7280;
    --border: #E5E7EB;
    --ring: rgba(79, 70, 229, 0.2);
  }
  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--surface);
    color: var(--text-main);
    margin: 0;
    padding: 24px;
    box-sizing: border-box;
  }
  .form-group {
    margin-bottom: 20px;
  }
  .form-row {
    display: flex;
    gap: 16px;
  }
  .form-row .form-group {
    flex: 1;
  }
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-main);
    margin-bottom: 6px;
  }
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-wrapper .material-symbols-outlined {
    position: absolute;
    left: 12px;
    color: #9CA3AF;
    font-size: 18px;
    pointer-events: none;
  }
  input, select {
    width: 100%;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: var(--text-main);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px 10px 38px;
    box-sizing: border-box;
    transition: all 0.2s;
    outline: none;
    appearance: none;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  select {
    padding-right: 32px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
  }
  input:hover, select:hover {
    border-color: #D1D5DB;
  }
  input:focus, select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--ring);
  }
  input::placeholder {
    color: #9CA3AF;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 32px;
  }
  button {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-secondary {
    background: var(--surface);
    color: #4B5563;
    border: 1px solid var(--border);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  .btn-secondary:hover {
    background: #F3F4F6;
  }
  .btn-primary {
    background: var(--primary);
    color: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .btn-primary:hover {
    background: var(--primary-hover);
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
  }
  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .success-msg {
    display: none;
    margin-top: 16px;
    padding: 12px;
    background: #ECFDF5;
    border: 1px solid #10B981;
    color: #065F46;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    animation: fadeIn 0.3s;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
</style>
</head>
<body>

  <div class="form-group">
    <label for="domains">${tr.cfg_domains}</label>
    <div class="input-wrapper">
      <span class="material-symbols-outlined">domain</span>
      <input id="domains" type="text" value="${domains}" placeholder="* ou example.com, company.org">
    </div>
  </div>

  <div class="form-group">
    <label for="lang">${tr.cfg_lang}</label>
    <div class="input-wrapper">
      <span class="material-symbols-outlined">language</span>
      <select id="lang">
        <option value="fr" ${lang === 'fr' ? 'selected' : ''}>🇫🇷 Français</option>
        <option value="en" ${lang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
      </select>
    </div>
  </div>

  <div class="form-group">
    <label for="emails">${tr.cfg_emails}</label>
    <div class="input-wrapper">
      <span class="material-symbols-outlined">mail</span>
      <input id="emails" type="text" value="${emails}" placeholder="admin@company.com">
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="schedDay">${tr.cfg_sched_day}</label>
      <div class="input-wrapper">
        <span class="material-symbols-outlined">calendar_today</span>
        <select id="schedDay">
          ${tr.days.map((d, i) => `<option value="${i}" ${i == schedDay ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="schedHour">${tr.cfg_sched_hour}</label>
      <div class="input-wrapper">
        <span class="material-symbols-outlined">schedule</span>
        <input id="schedHour" type="number" min="0" max="23" value="${schedHour}">
      </div>
    </div>
  </div>

  <div class="success-msg" id="msg">
    <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:4px;">check_circle</span>
    ${tr.cfg_saved}
  </div>

  <div class="footer">
    <button class="btn-secondary" onclick="google.script.host.close()">
      ${lang === 'fr' ? 'Annuler' : 'Cancel'}
    </button>
    <button class="btn-primary" id="btnSave" onclick="save()">
      <span class="material-symbols-outlined" style="font-size:18px;">save</span>
      ${tr.cfg_save}
    </button>
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
</script>
</body>
</html>`)
    .setWidth(460).setHeight(520);

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

  if (rebuildDashboard) {
    try {
      _buildDashboard(getSS(), t(), { mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices, mDNS });
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
  };

  return {
    lang    : getLang(),
    domains : getDomains(),
    metrics : metrics,
  };
}
