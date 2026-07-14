/**
 * ============================================================
 * AuditSecurity.gs — Audit de sécurité : OAuth & 2FA
 * ============================================================
 */

/**
 * Lance l'audit de sécurité : tokens OAuth tiers et 2FA.
 * Remplit la feuille SHEETS.SECURITY.
 */
function auditSecurity() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.SECURITY);

  showToast(tr.loading, tr.menu_security, 20);

  const headers = [
    tr.col_domain,
    tr.col_token_user,
    tr.col_app_passwords,
    tr.col_token_app,
    tr.col_token_scope,
    tr.col_severity,
    tr.col_token_issued,
    tr.col_2fa,
  ];

  prepareSheet(sheet, headers, `${SHEETS.SECURITY} — ${tr.dash_domain}`);

  const domains = getDomains();
  const allRows = [];
  const metrics = { oauthApps: 0, no2faUsers: 0, totalTokens: 0 };
  const tokenSet = new Set(); // évite les doublons app/user

  for (const domain of domains) {
    try {
      const users = _fetchUsers(domain);

      for (const user of users) {
        const userEmail = user.primaryEmail;
        const has2fa    = user.isEnrolledIn2Sv;
        if (!has2fa) metrics.no2faUsers++;

        // Récupération des tokens OAuth de cet utilisateur
        let tokens = [];
        try {
          const tokenResponse = AdminDirectory.Tokens.list(userEmail);
          tokens = tokenResponse.items || [];
        } catch (e) {
          // L'utilisateur peut ne pas avoir de tokens
          tokens = [];
        }

        // Récupération des mots de passe d'application (ASPs)
        let aspCount = 0;
        try {
          const asps = AdminDirectory.Asps.list(userEmail);
          aspCount = asps.items ? asps.items.length : 0;
        } catch (e) {}

        if (tokens.length === 0 && !has2fa && aspCount === 0) {
          // Utilisateur sans token, sans ASP, sans 2FA → ligne basique
          allRows.push([
            domain,
            userEmail,
            0,
            '—',
            '—',
            '—',
            '—',
            yesNo(has2fa),
          ]);
        } else {
          tokens.forEach((token, idx) => {
            metrics.totalTokens++;
            const appKey = `${userEmail}|${token.displayText}`;
            if (!tokenSet.has(appKey)) {
              tokenSet.add(appKey);
              metrics.oauthApps++;
            }

            const rawScopes = token.scopes || [];
            const scopes = rawScopes
              .map(s => _simplifyScope(s))
              .join('\n');

            let severity = 'INFO';
            for (const s of rawScopes) {
              if (s === 'https://mail.google.com/' || s === 'https://www.googleapis.com/auth/drive' || s.includes('admin.directory.user')) {
                severity = '🚨 CRITIQUE';
                break;
              }
              if (s.includes('gmail.modify') || s.includes('admin.directory.group')) {
                severity = '⚠️ ÉLEVÉ';
              } else if (severity === 'INFO' && (s.includes('drive.file') || s.includes('calendar') || s.includes('contacts'))) {
                severity = '🟡 MOYEN';
              }
            }

            allRows.push([
              idx === 0 ? domain    : '',
              idx === 0 ? userEmail : '',
              idx === 0 ? aspCount  : '',
              token.displayText || token.clientId || '—',
              truncate(scopes, 200),
              severity,
              formatDate(token.userKey ? null : null), // tokens n'ont pas de date dans l'API de base
              idx === 0 ? yesNo(has2fa) : '',
            ]);
          });
          
          if (tokens.length === 0 && aspCount > 0) {
             // Utilisateur avec ASP mais sans OAuth tokens
             allRows.push([
               domain,
               userEmail,
               aspCount,
               '—',
               '—',
               '⚠️ ÉLEVÉ',
               '—',
               yesNo(has2fa),
             ]);
          }
        }
      }
    } catch (err) {
      logError('auditSecurity', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '']);
    }
  }

  const colDefs = [
    {},                       // domain
    {},                       // user
    { type: 'center' },       // app passwords
    {},                       // app
    {},                       // scopes
    { type: 'center' },       // severity
    {},                       // issued
    { type: 'bool_good' },    // 2FA (bon si activé)
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('security', metrics);

  showToast(`${tr.done} — ${metrics.totalTokens} tokens, ${metrics.no2faUsers} ${tr.col_no_2fa}`, tr.menu_security);
  return metrics;
}

/**
 * Simplifie un scope OAuth pour l'affichage.
 * Ex: "https://www.googleapis.com/auth/drive.readonly" → "Drive (lecture)"
 * @param {string} scope
 * @returns {string}
 */
function _simplifyScope(scope) {
  const lang = getLang();
  const scopeMap = {
    'drive'                    : lang === 'fr' ? 'Drive (complet)'    : 'Drive (full)',
    'drive.readonly'           : lang === 'fr' ? 'Drive (lecture)'    : 'Drive (read)',
    'drive.file'               : lang === 'fr' ? 'Drive (fichiers)'   : 'Drive (files)',
    'gmail.readonly'           : lang === 'fr' ? 'Gmail (lecture)'    : 'Gmail (read)',
    'gmail.send'               : lang === 'fr' ? 'Gmail (envoi)'      : 'Gmail (send)',
    'gmail.modify'             : lang === 'fr' ? 'Gmail (modification)': 'Gmail (modify)',
    'gmail.compose'            : lang === 'fr' ? 'Gmail (rédaction)'  : 'Gmail (compose)',
    'calendar'                 : 'Calendar',
    'calendar.readonly'        : lang === 'fr' ? 'Calendar (lecture)' : 'Calendar (read)',
    'contacts'                 : 'Contacts',
    'contacts.readonly'        : lang === 'fr' ? 'Contacts (lecture)' : 'Contacts (read)',
    'admin.directory.user'     : 'Admin Directory',
    'spreadsheets'             : 'Sheets',
    'spreadsheets.readonly'    : lang === 'fr' ? 'Sheets (lecture)'   : 'Sheets (read)',
    'userinfo.email'           : 'Email info',
    'userinfo.profile'         : 'Profil',
    'openid'                   : 'OpenID',
  };

  // Extrait la partie après /auth/
  const match = scope.match(/\/auth\/(.+)$/);
  if (match) {
    const key = match[1];
    return scopeMap[key] || key;
  }
  return scope;
}
