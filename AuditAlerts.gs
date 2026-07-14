/**
 * ============================================================
 * AuditAlerts.gs — Centre d'Alerte (Alert Center API)
 * ============================================================
 */

/**
 * Lance l'audit des alertes Google Workspace.
 * Remplit la feuille SHEETS.ALERTS.
 */
function auditAlerts() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.ALERTS);

  showToast(tr.loading, tr.menu_alerts, 20);

  const headers = [
    tr.col_alert_time,
    tr.col_alert_type,
    tr.col_alert_severity,
    tr.col_alert_status,
    tr.col_alert_source,
    tr.col_alert_desc
  ];

  prepareSheet(sheet, headers, `${SHEETS.ALERTS} — ${tr.dash_domain}`);

  const allRows = [];
  const metrics = { totalAlerts: 0, highSeverity: 0 };
  
  // Récupère les alertes des 30 derniers jours
  const startDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  try {
    const alerts = _fetchAlerts(startDate);
    
    for (const alert of alerts) {
      metrics.totalAlerts++;
      
      const type = alert.type || 'Unknown';
      const source = alert.source || '—';
      const status = alert.metadata && alert.metadata.status ? alert.metadata.status : '—';
      const severity = _getAlertSeverity(type, alert.metadata && alert.metadata.severity ? alert.metadata.severity : null);
      
      if (severity === '🚨 CRITIQUE' || severity === '⚠️ ÉLEVÉ') {
        metrics.highSeverity++;
      }

      allRows.push([
        formatDate(alert.createTime),
        type,
        severity,
        status,
        source,
        truncate(JSON.stringify(alert.data || {}), 300)
      ]);
    }
  } catch (err) {
    logError('auditAlerts', err);
    allRows.push([`❌ ${err.message}`, '', '', '', '', '']);
  }

  // Tri par date décroissante
  allRows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));

  const colDefs = [
    {},                       // time
    {},                       // type
    { type: 'center' },       // severity
    {},                       // status
    {},                       // source
    {}                        // desc
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('alerts', metrics);

  showToast(`${tr.done} — ${metrics.totalAlerts} alertes (30j)`, tr.menu_alerts);
  return metrics;
}

/**
 * Récupère les alertes depuis AlertCenter API.
 * @param {string} startTime ISO date
 * @returns {Object[]}
 */
function _fetchAlerts(startTime) {
  const results = [];
  let pageToken = null;

  do {
    let url = `https://alertcenter.googleapis.com/v1beta1/alerts?filter=createTime > "${startTime}"`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.alerts) results.push(...data.alerts);
        pageToken = data.nextPageToken;
      } else {
        logError('_fetchAlerts API', new Error(response.getContentText()));
        break;
      }
    } catch(e) {
      logError('_fetchAlerts', e);
      break;
    }
  } while (pageToken);

  return results;
}

/**
 * Détermine la sévérité d'une alerte.
 */
function _getAlertSeverity(type, apiSeverity) {
  const CRITICAL_TYPES = [
    'Suspicious login',
    'Malware detected',
    'Government-backed attack',
    'Data exfiltration'
  ];
  
  const HIGH_TYPES = [
    'Phishing email reported',
    'Super admin password reset',
    'User suspended (spam)'
  ];

  if (CRITICAL_TYPES.includes(type)) return '🚨 CRITIQUE';
  if (HIGH_TYPES.includes(type)) return '⚠️ ÉLEVÉ';
  
  if (apiSeverity === 'HIGH') return '⚠️ ÉLEVÉ';
  if (apiSeverity === 'MEDIUM') return '🟡 MOYEN';
  
  return 'ℹ️ INFO';
}
