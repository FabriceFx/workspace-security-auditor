/**
 * ============================================================
 * AuditLoginActivity.gs — Audit des connexions (Reports API)
 * ============================================================
 */

/**
 * Lance l'audit des connexions des 7 derniers jours.
 * Remplit la feuille SHEETS.LOGIN.
 */
function auditLoginActivity() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.LOGIN);

  showToast(tr.loading, tr.menu_login, 20);

  const headers = [
    tr.col_domain,
    tr.col_login_time,
    tr.col_login_user,
    tr.col_login_ip,
    tr.col_login_type,
    tr.col_login_result,
    tr.col_login_country,
  ];

  prepareSheet(sheet, headers, `${SHEETS.LOGIN} — ${tr.dash_domain}`);

  const domains    = getDomains();
  const allRows    = [];
  const startTime  = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const metrics    = { failedLogins: 0, suspiciousLogins: 0, totalLogins: 0 };
  
  const startTimeMs = Date.now();
  const MAX_EXECUTION_TIME = 5 * 60 * 1000;
  let timeLimitReached = false;

  for (const domain of domains) {
    if (timeLimitReached) break;
    
    try {
      const activities = _fetchLoginActivities(domain, startTime);

      for (const activity of activities) {
        if (Date.now() - startTimeMs > MAX_EXECUTION_TIME) {
          timeLimitReached = true;
          break;
        }

        const actor     = activity.actor || {};
        const ipAddress = activity.ipAddress || '—';
        const time      = activity.id ? activity.id.time : '';
        const events    = activity.events || [];

        for (const event of events) {
          metrics.totalLogins++;

          const loginType   = _loginType(event, tr);
          const loginResult = _loginResult(event, tr);
          const isFailed    = _isFailedLogin(event);
          const country     = _extractParam(event, 'country') || '—';

          if (isFailed) metrics.failedLogins++;

          allRows.push([
            domain,
            formatDate(time),
            actor.email || '—',
            ipAddress,
            loginType,
            loginResult,
            country,
          ]);
        }
      }
    } catch (err) {
      logError('auditLoginActivity', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '', '']);
    }
  }
  
  if (timeLimitReached) {
    allRows.unshift(['⚠️', 'AUDIT PARTIEL : Limite de temps Google atteinte (5 min)', '', '', '', '', '']);
  }

  // Tri par date décroissante
  allRows.sort((a, b) => String(b[1]).localeCompare(String(a[1])));

  const colDefs = [
    {},                      // domain
    {},                      // time
    {},                      // user
    {},                      // ip
    {},                      // type
    { type: 'risk' },        // result (succès/échec coloré)
    {},                      // country
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('login', metrics);

  showToast(
    `${tr.done} — ${metrics.totalLogins} connexions, ${metrics.failedLogins} ${getLang() === 'fr' ? 'échouées' : 'failed'}`,
    tr.menu_login
  );
  return metrics;
}

/**
 * Récupère les activités de connexion via la Reports API.
 * @param {string} domain
 * @param {string} startTime ISO date
 * @returns {Object[]}
 */
function _fetchLoginActivities(domain, startTime) {
  const results  = [];
  let pageToken  = null;

  do {
    const params = {
      userKey: 'all',
      maxResults: 1000,
      startTime: startTime,
    };
    if (pageToken) params.pageToken = pageToken;

    try {
      const response = AdminReports.Activities.list('all', 'login', params);
      if (response.items) results.push(...response.items);
      pageToken = response.nextPageToken;
    } catch(e) {
      logError('_fetchLoginActivities', e);
      break;
    }
  } while (pageToken && results.length < 10000);

  return results;
}

/**
 * Retourne le type de connexion lisible.
 * @param {Object} event
 * @param {Object} tr
 * @returns {string}
 */
function _loginType(event, tr) {
  const lang = getLang();
  const name = event.name || '';
  const map = {
    'login_success'  : lang === 'fr' ? 'Connexion réussie'     : 'Successful login',
    'login_failure'  : lang === 'fr' ? 'Échec de connexion'    : 'Login failure',
    'login_challenge': lang === 'fr' ? 'Défi de connexion'     : 'Login challenge',
    'login_verification': lang === 'fr' ? 'Vérification 2FA'   : '2FA verification',
    'logout'         : lang === 'fr' ? 'Déconnexion'           : 'Logout',
    'risky_sensitive_action': lang === 'fr' ? 'Action risquée' : 'Risky action',
  };
  return map[name] || name || '—';
}

/**
 * Retourne le résultat de connexion (succès/échec) avec icône.
 * @param {Object} event
 * @param {Object} tr
 * @returns {string}
 */
function _loginResult(event, tr) {
  const lang = getLang();
  const name = event.name || '';

  if (name === 'login_success') return `✅ ${lang === 'fr' ? 'Succès' : 'Success'}`;
  if (name === 'login_failure') return `🚨 ${lang === 'fr' ? 'Échec'  : 'Failed'}`;
  if (name === 'login_challenge') {
    const result = _extractParam(event, 'login_challenge_status');
    if (result === 'Challenge Passed') return `✅ ${lang === 'fr' ? 'Défi passé' : 'Passed'}`;
    if (result === 'Challenge Failed') return `🚨 ${lang === 'fr' ? 'Défi échoué' : 'Failed'}`;
  }
  return `⚠️ ${name}`;
}

/**
 * Détermine si un événement est un échec de connexion.
 * @param {Object} event
 * @returns {boolean}
 */
function _isFailedLogin(event) {
  const name = event.name || '';
  if (name === 'login_failure') return true;
  if (name === 'login_challenge') {
    const status = _extractParam(event, 'login_challenge_status');
    return status === 'Challenge Failed';
  }
  return false;
}

/**
 * Extrait un paramètre d'événement par son nom.
 * @param {Object} event
 * @param {string} paramName
 * @returns {string|null}
 */
function _extractParam(event, paramName) {
  if (!event.parameters) return null;
  const p = event.parameters.find(p => p.name === paramName);
  return p ? (p.value || null) : null;
}
