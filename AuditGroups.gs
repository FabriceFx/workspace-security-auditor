/**
 * ============================================================
 * AuditGroups.gs — Audit des groupes et membres
 * ============================================================
 */

/**
 * Lance l'audit des groupes pour tous les domaines configurés.
 * Remplit la feuille SHEETS.GROUPS.
 */
function auditGroups() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.GROUPS);

  showToast(tr.loading, tr.menu_groups, 15);

  const headers = [
    tr.col_domain,
    tr.col_group_name,
    tr.col_group_email,
    tr.col_member_count,
    tr.col_visibility,
    tr.col_allow_ext,
    tr.col_member_email,
    tr.col_member_role,
    tr.col_member_type,
  ];

  prepareSheet(sheet, headers, `${SHEETS.GROUPS} — ${tr.dash_domain}`);

  const domains = getDomains();
  const allRows = [];
  const metrics = { totalGroups: 0, emptyGroups: 0, externalGroups: 0, orphanGroups: 0 };
  
  const startTimeMs = Date.now();
  const MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 minutes
  let timeLimitReached = false;

  for (const domain of domains) {
    if (timeLimitReached) break;

    try {
      const groups = _fetchGroups(domain);
      metrics.totalGroups += groups.length;

      for (const group of groups) {
        if (Date.now() - startTimeMs > MAX_EXECUTION_TIME) {
          timeLimitReached = true;
          break;
        }

        const groupEmail   = group.email || '';
        const groupName    = group.name  || '';
        const memberCount  = group.directMembersCount || 0;
        
        // Récupération des paramètres via l'API Groups Settings
        const settings = _fetchGroupSettings(groupEmail);
        const allowExtSend = settings.allowExternalMembers === 'true' || settings.allowExternalMembers === true;
        const visibility = _groupVisibility(settings);

        if (parseInt(memberCount) === 0) metrics.emptyGroups++;
        if (allowExtSend) metrics.externalGroups++;

        // Récupération des membres du groupe
        let members = [];
        try {
          members = _fetchGroupMembers(groupEmail);
        } catch (e) {
          logError('fetchGroupMembers-loop', e);
          members = [];
        }

        if (members.length === 0) {
          metrics.orphanGroups++;
          // Groupe sans membre : une ligne quand même
          allRows.push([
            domain,
            '👻 ' + groupName,
            groupEmail,
            memberCount,
            visibility,
            yesNo(allowExtSend),
            tr.no_data,
            '—',
            '—',
          ]);
        } else {
          const hasOwner = members.some(m => m.role === 'OWNER');
          if (!hasOwner) metrics.orphanGroups++;

          // Une ligne par membre avec les données répétées
          members.forEach((member) => {
            allRows.push([
              domain,
              (!hasOwner ? '👻 ' : '') + groupName,
              groupEmail,
              memberCount,
              visibility,
              yesNo(allowExtSend),
              member.email || '',
              _memberRole(member.role),
              _memberType(member.type),
            ]);
          });
        }
      }
    } catch (err) {
      logError('auditGroups', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '', '', '', '']);
    }
  }

  if (timeLimitReached) {
    allRows.unshift(['⚠️', 'AUDIT PARTIEL : Limite de temps Google atteinte (5 min)', '', '', '', '', '', '', '']);
  }

  const colDefs = [
    {},                       // domain
    { type: 'center' },       // group name
    {},                       // group email
    { type: 'center' },       // member count
    {},                       // visibility
    { type: 'bool_danger' },  // external send
    {},                       // member email
    {},                       // role
    {},                       // type
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('groups', metrics);

  showToast(`${tr.done} — ${metrics.totalGroups} ${tr.menu_groups.replace(/[^ ]+\s/, '')}`, tr.menu_groups);
  return metrics;
}

/**
 * Récupère tous les groupes d'un domaine.
 * Tente d'utiliser le domaine spécifié. En cas d'échec ou d'absence de résultat,
 * essaie avec customer: 'my_customer' (utile pour certains alias/configurations).
 * @param {string} domain
 * @returns {Object[]}
 */
function _fetchGroups(domain) {
  const results = [];
  let pageToken = null;
  const cleanDomain = domain.trim().toLowerCase();

  // Mode "Toute la console"
  if (cleanDomain === '*' || cleanDomain === 'my_customer') {
    try {
      do {
        const params = { customer: 'my_customer', maxResults: 200 };
        if (pageToken) params.pageToken = pageToken;
        const response = AdminDirectory.Groups.list(params);
        if (response.groups) results.push(...response.groups);
        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch (e) {
      logError('fetchGroups-customer-all', e);
      throw e;
    }
    return results;
  }

  // Mode "Domaine spécifique"
  let errDomain = null;
  try {
    do {
      const params = { domain: cleanDomain, maxResults: 200 };
      if (pageToken) params.pageToken = pageToken;
      const response = AdminDirectory.Groups.list(params);
      if (response.groups) results.push(...response.groups);
      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (e) { 
    errDomain = e.message;
    logError('fetchGroups-domain', e); 
  }

  // Fallback si 0 groupe trouvé (ou erreur)
  if (results.length === 0) {
    try {
      pageToken = null;
      do {
        const params = { customer: 'my_customer', maxResults: 200 };
        if (pageToken) params.pageToken = pageToken;
        const response = AdminDirectory.Groups.list(params);
        if (response.groups) {
          for (const group of response.groups) {
            if (group.email && group.email.toLowerCase().endsWith('@' + cleanDomain)) {
              results.push(group);
            }
          }
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch (e) { 
      logError('fetchGroups-customer-fallback', e);

      logError('fetchGroups-customer', e); 
    }
  }

  // Si on a eu des erreurs et 0 résultat, on lève une exception pour l'afficher à l'utilisateur
  if (results.length === 0 && (errDomain || errCustomer)) {
    throw new Error(`API Error: Domain fallback [${errDomain || 'None'}] - Customer fallback [${errCustomer || 'None'}]`);
  }

  return results;
}

/**
 * Récupère tous les membres d'un groupe avec gestion des limites de quota.
 * @param {string} groupEmail
 * @returns {Object[]}
 */
function _fetchGroupMembers(groupEmail) {
  const results = [];
  let pageToken = null;

  do {
    const params = { maxResults: 200, includeDerivedMembership: false };
    if (pageToken) params.pageToken = pageToken;

    const response = exponentialBackoff(() => AdminDirectory.Members.list(groupEmail, params));
    if (response.members) results.push(...response.members);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return results;
}

/**
 * Récupère les paramètres de confidentialité et partage d'un groupe.
 * Utilise l'API Groups Settings avec gestion des limites de quota.
 * @param {string} groupEmail
 * @returns {Object}
 */
function _fetchGroupSettings(groupEmail) {
  try {
    return exponentialBackoff(() => AdminGroupsSettings.Groups.get(groupEmail));
  } catch (e) {
    logError('fetchGroupSettings', e);
    return {};
  }
}

/**
 * Traduit la visibilité d'un groupe à partir de ses paramètres.
 * @param {Object} settings (renvoyé par AdminGroupsSettings)
 * @returns {string}
 */
function _groupVisibility(settings) {
  const tr = t();
  if (!settings.whoCanViewGroup) return '—';
  return settings.whoCanViewGroup.includes('ANYONE') ? tr.status_public : tr.status_private;
}

/**
 * Traduit le rôle d'un membre.
 * @param {string} role
 * @returns {string}
 */
function _memberRole(role) {
  const lang = getLang();
  const map = {
    OWNER:   lang === 'fr' ? 'Propriétaire' : 'Owner',
    MANAGER: lang === 'fr' ? 'Gestionnaire' : 'Manager',
    MEMBER:  lang === 'fr' ? 'Membre'       : 'Member',
  };
  return map[role] || role || '—';
}

/**
 * Traduit le type d'un membre.
 * @param {string} type
 * @returns {string}
 */
function _memberType(type) {
  const lang = getLang();
  const map = {
    USER:    lang === 'fr' ? 'Utilisateur' : 'User',
    GROUP:   lang === 'fr' ? 'Groupe'      : 'Group',
    EXTERNAL: lang === 'fr' ? 'Externe'    : 'External',
    SERVICE_ACCOUNT: lang === 'fr' ? 'Compte service' : 'Service Account',
  };
  return map[type] || type || '—';
}
