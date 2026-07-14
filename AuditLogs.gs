/**
 * ============================================================
 * AuditLogs.gs — Journaux d'activité Admin (Reports API)
 * ============================================================
 */

/**
 * Lance l'audit des journaux d'activité Admin Console.
 * Remplit la feuille SHEETS.LOGS.
 */
function auditLogs() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.LOGS);

  showToast(tr.loading, tr.menu_logs, 20);

  const headers = [
    tr.col_domain,
    tr.col_log_time,
    tr.col_log_actor,
    tr.col_log_event,
    tr.col_log_target,
    tr.col_log_ip,
  ];

  prepareSheet(sheet, headers, `${SHEETS.LOGS} — ${tr.dash_domain}`);

  const domains = getDomains();
  const allRows = [];
  // Récupère les 7 derniers jours
  const startTime = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  for (const domain of domains) {
    try {
      const activities = _fetchAdminActivities(domain, startTime);

      for (const activity of activities) {
        const actor     = activity.actor   || {};
        const ipAddress = activity.ipAddress || '—';
        const time      = activity.id      ? activity.id.time : '';

        const events = activity.events || [];
        for (const event of events) {
          const eventName = _translateAdminEvent(event.name);
          const target    = _extractTarget(event);

          allRows.push([
            domain,
            formatDate(time),
            actor.email || actor.profileId || '—',
            eventName,
            truncate(target, 150),
            ipAddress,
          ]);
        }
      }
    } catch (err) {
      logError('auditLogs', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '']);
    }
  }

  // Tri par date décroissante
  allRows.sort((a, b) => String(b[1]).localeCompare(String(a[1])));

  writeDataRows(sheet, allRows, [{}, {}, {}, {}, {}, {}]);
  addAutoFilter(sheet, headers.length);

  showToast(`${tr.done} — ${allRows.length} ${getLang() === 'fr' ? 'événements (7j)' : 'events (7d)'}`, tr.menu_logs);
}

/**
 * Récupère les activités Admin pour un domaine.
 * @param {string} domain
 * @param {string} startTime ISO date
 * @returns {Object[]}
 */
function _fetchAdminActivities(domain, startTime) {
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
      const response = AdminReports.Activities.list('all', 'admin', params);
      if (response.items) results.push(...response.items);
      pageToken = response.nextPageToken;
    } catch(e) {
      logError('_fetchAdminActivities', e);
      break;
    }
  } while (pageToken && results.length < 5000);

  return results;
}

/**
 * Traduit un nom d'événement Admin en libellé lisible.
 * @param {string} name
 * @returns {string}
 */
function _translateAdminEvent(name) {
  const lang = getLang();
  const map = {
    // Utilisateurs
    'CREATE_USER'                   : lang === 'fr' ? 'Création utilisateur'        : 'User created',
    'DELETE_USER'                   : lang === 'fr' ? 'Suppression utilisateur'     : 'User deleted',
    'SUSPEND_USER'                  : lang === 'fr' ? 'Suspension utilisateur'      : 'User suspended',
    'UNSUSPEND_USER'                : lang === 'fr' ? 'Réactivation utilisateur'    : 'User unsuspended',
    'RENAME_USER'                   : lang === 'fr' ? 'Renommage utilisateur'       : 'User renamed',
    'CHANGE_PASSWORD'               : lang === 'fr' ? 'Changement de mot de passe' : 'Password changed',
    'RESET_PASSWORD'                : lang === 'fr' ? 'Réinitialisation MDP'        : 'Password reset',
    'ADMIN_PRIVILEGE_CHANGE'        : lang === 'fr' ? 'Changement de privilèges'   : 'Privilege changed',
    // Groupes
    'CREATE_GROUP'                  : lang === 'fr' ? 'Création groupe'            : 'Group created',
    'DELETE_GROUP'                  : lang === 'fr' ? 'Suppression groupe'         : 'Group deleted',
    'ADD_GROUP_MEMBER'              : lang === 'fr' ? 'Ajout membre groupe'        : 'Member added to group',
    'REMOVE_GROUP_MEMBER'           : lang === 'fr' ? 'Suppression membre groupe'  : 'Member removed from group',
    // Sécurité
    'TOGGLE_SERVICE_ENABLED'        : lang === 'fr' ? 'Activation/désactivation service' : 'Service toggled',
    'ENFORCE_STRONG_AUTHENTICATION' : lang === 'fr' ? 'Authentification forte'     : 'Strong auth enforced',
    'ENROLL_USER_IN_2_STEP_VERIFICATION': lang === 'fr' ? '2FA activé'             : '2FA enrolled',
    'AUTHORIZE_API_CLIENT_ACCESS'   : lang === 'fr' ? 'Autorisation client OAuth'  : 'OAuth client authorized',
    'REVOKE_API_CLIENT_ACCESS'      : lang === 'fr' ? 'Révocation client OAuth'    : 'OAuth client revoked',
    // Risques ciblés (Account Takeover / Exfiltration)
    'CHANGE_MAIL_FORWARDING_SETTING': lang === 'fr' ? '🚨 Transfert email activé'  : '🚨 Mail forwarding enabled',
    'CHANGE_RECOVERY_EMAIL'         : lang === 'fr' ? '⚠️ Email secours modifié'   : '⚠️ Recovery email changed',
    'CHANGE_RECOVERY_PHONE'         : lang === 'fr' ? '⚠️ Tél. secours modifié'    : '⚠️ Recovery phone changed',
    // Applications
    'INSTALL_APPLICATION'           : lang === 'fr' ? 'Installation application'   : 'App installed',
    'UNINSTALL_APPLICATION'         : lang === 'fr' ? 'Désinstallation application': 'App uninstalled',
  };
  return map[name] || name || '—';
}

/**
 * Extrait une cible lisible depuis les paramètres d'un événement.
 * @param {Object} event
 * @returns {string}
 */
function _extractTarget(event) {
  if (!event.parameters) return '—';
  const params = event.parameters;
  // Priorité aux paramètres les plus informatifs
  const priority = ['USER_EMAIL', 'GROUP_EMAIL', 'APPLICATION_NAME', 'API_CLIENT_NAME',
                    'DOMAIN_NAME', 'SETTING_NAME', 'NEW_VALUE'];
  for (const key of priority) {
    const p = params.find(p => p.name === key);
    if (p) return p.value || p.multiValue?.join(', ') || '—';
  }
  // Fallback : premier paramètre avec valeur
  const first = params.find(p => p.value || p.multiValue);
  if (first) return first.value || first.multiValue?.join(', ') || '—';
  return '—';
}
