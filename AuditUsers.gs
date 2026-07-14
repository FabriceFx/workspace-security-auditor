/**
 * ============================================================
 * AuditUsers.gs — Audit des utilisateurs du domaine
 * ============================================================
 */

/**
 * Lance l'audit des utilisateurs pour tous les domaines configurés.
 * Remplit la feuille SHEETS.USERS.
 */
function auditUsers() {
  const tr   = t();
  const ss   = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.USERS);

  showToast(tr.loading, tr.menu_users, 10);

  const headers = [
    tr.col_domain,
    tr.col_email,
    tr.col_name,
    tr.col_status,
    tr.col_last_login,
    tr.col_created,
    tr.col_2fa,
    tr.col_is_admin,
    tr.col_is_super_admin,
    tr.col_suspended,
    tr.col_org_unit,
    tr.col_inactive,
    tr.col_recovery_email,
    tr.col_recovery_phone,
  ];

  prepareSheet(sheet, headers, `${SHEETS.USERS} — ${tr.dash_domain}`);

  const domains  = getDomains();
  const allRows  = [];
  const metrics  = { totalUsers: 0, inactiveUsers: 0, no2faUsers: 0, suspendedUsers: 0, adminUsers: 0 };

  for (const domain of domains) {
    try {
      const users = _fetchUsers(domain);
      for (const user of users) {
        metrics.totalUsers++;

        const lastLogin = user.lastLoginTime ? new Date(user.lastLoginTime) : null;
        const created   = user.creationTime  ? new Date(user.creationTime)  : null;
        const inactive  = daysSince(lastLogin) > DEFAULT_INACTIVE_DAYS;
        const no2fa     = !user.isEnrolledIn2Sv;
        const suspended = user.suspended;

        if (inactive)  metrics.inactiveUsers++;
        if (no2fa)     metrics.no2faUsers++;
        if (suspended) metrics.suspendedUsers++;
        if (user.isAdmin || user.isDelegatedAdmin) metrics.adminUsers++;

        // Vérification de sécurité des emails de récupération
        let recEmail = user.recoveryEmail || '';
        let isExternalEmail = recEmail && !recEmail.toLowerCase().endsWith(`@${domain}`);
        if (isExternalEmail && recEmail) {
          recEmail = `⚠️ ${recEmail}`; // Marqueur d'alerte si externe
        }

        allRows.push([
          domain,
          user.primaryEmail || '',
          (user.name && user.name.fullName) || '',
          suspended ? tr.status_suspended : tr.status_active,
          formatDate(lastLogin),
          formatDate(created),
          yesNo(!no2fa),       // 2FA → inversé : true = activé = bon
          yesNo(user.isAdmin || user.isDelegatedAdmin),
          yesNo(user.isAdmin && user.customerId),  // super admin estimation
          yesNo(suspended),
          user.orgUnitPath || '/',
          inactive ? tr.status_yes : tr.status_no,
          recEmail,
          user.recoveryPhone || '',
        ]);
      }
    } catch (err) {
      logError('auditUsers', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '', '', '', '', '', '', '']);
    }
  }

  const colDefs = [
    {},                           // domain
    {},                           // email
    {},                           // nom
    { type: 'risk' },             // statut
    {},                           // last login
    {},                           // created
    { type: 'bool_good' },        // 2FA (bon si oui)
    { type: 'center' },           // admin
    { type: 'center' },           // super admin
    { type: 'bool_danger' },      // suspendu
    {},                           // org unit
    { type: 'bool_danger' },      // inactif
    {},                           // recovery email
    {},                           // recovery phone
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);

  // Sauvegarde des métriques pour le dashboard
  _saveMetrics('users', metrics);

  showToast(`${tr.done} — ${metrics.totalUsers} ${tr.menu_users.replace(/[^ ]+\s/, '')}`, tr.menu_users);
  return metrics;
}

/**
 * Récupère tous les utilisateurs d'un domaine avec pagination.
 * @param {string} domain
 * @returns {Object[]}
 */
function _fetchUsers(domain) {
  const results = [];
  let pageToken = null;

  do {
    const params = {
      maxResults: 500,
      projection: 'full',
      orderBy: 'email',
    };
    if (domain === '*' || domain === 'my_customer') {
      params.customer = 'my_customer';
    } else {
      params.domain = domain;
    }
    if (pageToken) params.pageToken = pageToken;

    const response = AdminDirectory.Users.list(params);
    if (response.users) results.push(...response.users);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return results;
}

/**
 * Sauvegarde les métriques d'un module dans les propriétés du script.
 * @param {string} key
 * @param {Object} data
 */
function _saveMetrics(key, data) {
  PropertiesService.getScriptProperties()
    .setProperty(`METRICS_${key.toUpperCase()}`, JSON.stringify(data));
}

/**
 * Récupère les métriques d'un module.
 * @param {string} key
 * @returns {Object}
 */
function _getMetrics(key) {
  const raw = PropertiesService.getScriptProperties()
    .getProperty(`METRICS_${key.toUpperCase()}`);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch(e) { return {}; }
}
