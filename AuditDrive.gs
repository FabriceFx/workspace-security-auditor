/**
 * ============================================================
 * AuditDrive.gs — Audit des fichiers Drive et partages
 * Supporte les filtres : all | user | department | costCenter | orgUnit
 * ============================================================
 */

/**
 * Point d'entrée principal : affiche le dialog de filtre Drive.
 * Appelé depuis le menu "Drive & Partages".
 */
function showDriveFilterDialog() {
  const tr = t();
  const lang = getLang();

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
  <label for="filterType" class="gw-label">${lang === 'fr' ? "P\u00e9rim\u00e8tre d'audit" : 'Audit scope'}</label>
  <select id="filterType" class="gw-input" onchange="onTypeChange(this.value)">
    <option value="all">${lang === 'fr' ? '🌍 Tout le domaine' : '🌍 Entire domain'}</option>
    <option value="user">${lang === 'fr' ? '👤 Utilisateur spécifique' : '👤 Specific user'}</option>
    <option value="group">${lang === 'fr' ? '👥 Groupe spécifique' : '👥 Specific group'}</option>
    <option value="department">${lang === 'fr' ? '🏢 Département' : '🏢 Department'}</option>
    <option value="costCenter">${lang === 'fr' ? '💰 Centre de coût' : '💰 Cost Center'}</option>
    <option value="orgUnit">${lang === 'fr' ? '🗂 Unité organisationnelle' : '🗂 Org Unit'}</option>
  </select>
</div>

<div id="valueWrap" class="block form-group">
  <label id="valueLabel" class="gw-label">${lang === 'fr' ? 'Valeur du filtre' : 'Filter value'}</label>
  <div id="loadingRow" class="loading-row" style="display:none;">
    <span class="spinner"></span>
    <span id="loadingText">${lang === 'fr' ? 'Chargement...' : 'Loading...'}</span>
  </div>
  <!-- Pour select (Depts, Cost Centers, etc) -->
  <select id="valueSelect" class="gw-input" style="display:none;"></select>
  
  <!-- Pour input autocomplete (Users) -->
  <div id="userSearchWrap" style="display:none; position:relative;">
    <input type="text" id="valueInput" class="gw-input" autocomplete="off"
           placeholder="${lang === 'fr' ? 'Saisissez ou recherchez un email...' : 'Search name or email...'}" 
           oninput="onUserSearch(this.value)">
    <select id="userDropdown" class="gw-input" size="5" 
            style="display:none; position:absolute; z-index:10; top:100%; left:0; margin-top:2px; height:auto; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" 
            onchange="document.getElementById('valueInput').value = this.value; this.style.display='none';">
    </select>
  </div>
</div>

<div class="info-note" id="infoNote" style="display:none;"></div>

<div class="footer-actions">
  <button class="gw-btn gw-btn-secondary" onclick="google.script.host.close()">${lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
  <button class="gw-btn gw-btn-primary" id="btnRun" onclick="runAudit()">
    <span class="material-symbols-outlined">play_arrow</span>
    ${lang === 'fr' ? "Lancer l'audit" : 'Run Audit'}
  </button>
</div>

<script>
const LANG = '${lang}';
let filterOptions = null; // Cache: { users, departments, costCenters, orgUnits }

// Libellés par type
const LABELS = {
  fr: {
    user: 'Utilisateur', group: 'Groupe', department: 'Département',
    costCenter: 'Centre de coût', orgUnit: 'Unité organisationnelle',
  },
  en: {
    user: 'User', group: 'Group', department: 'Department',
    costCenter: 'Cost Center', orgUnit: 'Org Unit',
  }
};

// Notes info par type
const NOTES = {
  fr: {
    all: 'Analyse tous les fichiers partagés du domaine. Peut être long.',
    user: 'Analyse uniquement les fichiers partagés dont cet utilisateur est propriétaire.',
    group: 'Analyse les fichiers partagés des membres de ce groupe.',
    department: 'Analyse les fichiers partagés des utilisateurs du département sélectionné.',
    costCenter: 'Analyse les fichiers partagés des utilisateurs de ce centre de coût.',
    orgUnit: 'Analyse les fichiers partagés des utilisateurs de cette unité organisationnelle.',
  },
  en: {
    all: 'Analyzes all shared files in the domain. May take a while.',
    user: 'Analyzes only shared files owned by this specific user.',
    group: 'Analyzes shared files owned by members of this group.',
    department: 'Analyzes shared files owned by users in the selected department.',
    costCenter: 'Analyzes shared files owned by users in this cost center.',
    orgUnit: 'Analyzes shared files owned by users in this org unit.',
  }
};

function onTypeChange(type) {
  const wrap    = document.getElementById('valueWrap');
  const note    = document.getElementById('infoNote');
  const lbl     = document.getElementById('valueLabel');
  const select  = document.getElementById('valueSelect');
  const input   = document.getElementById('valueInput');
  const loading = document.getElementById('loadingRow');
  const loadTxt = document.getElementById('loadingText');

  // Mise à jour de la note info
  const noteText = NOTES[LANG][type] || '';
  note.textContent = noteText;
  note.style.display = noteText ? '' : 'none';

  if (type === 'all') {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  lbl.textContent = LABELS[LANG][type] || type;

  // Mode Utilisateur ou Groupe : Input avec recherche dynamique
  if (type === 'user' || type === 'group') {
    select.style.display = 'none';
    document.getElementById('userSearchWrap').style.display = 'block';
    input.value = '';
    document.getElementById('userDropdown').style.display = 'none';
    loading.style.display = 'none';
    input.focus();
    return;
  }

  // Autres modes : Select avec options préchargées
  document.getElementById('userSearchWrap').style.display = 'none';
  select.style.display = 'block';

  // Si on a déjà les données en cache, peupler directement
  if (filterOptions) {
    populateSelect(type);
    return;
  }

  // Sinon charger depuis le serveur
  loadTxt.textContent = LANG === 'fr' ? 'Chargement des options...' : 'Loading options...';
  loading.style.display = '';

  google.script.run
    .withSuccessHandler(data => {
      filterOptions = data;
      loading.style.display = 'none';
      populateSelect(type);
    })
    .withFailureHandler(err => {
      loading.style.display = 'none';
      select.innerHTML = '<option value="">— Erreur: ' + err.message + ' —</option>';
      select.style.display = '';
    })
    .getDriveFilterOptions();
}

function populateSelect(type) {
  const select = document.getElementById('valueSelect');
  const empty  = LANG === 'fr' ? '— Aucune valeur trouvée —' : '— No values found —';

  const key  = type + 's'; // departments, costCenters, orgUnits
  const list = (filterOptions && filterOptions[key]) || [];
  
  function escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  if (list.length === 0) {
    select.innerHTML = '<option value="">' + empty + '</option>';
  } else {
    select.innerHTML =
      '<option value="">' + (LANG === 'fr' ? '— Choisir —' : '— Choose —') + '</option>' +
      list.map(v => {
        const safeV = escapeHtml(v);
        return '<option value="' + safeV + '">' + safeV + '</option>';
      }).join('');
  }
  
  select.style.display = '';
}

let searchTimer;
function onUserSearch(query) {
  const ud = document.getElementById('userDropdown');
  const loading = document.getElementById('loadingRow');
  const loadTxt = document.getElementById('loadingText');
  
  clearTimeout(searchTimer);
  ud.style.display = 'none';
  
  if (query.length < 3) {
    loading.style.display = 'none';
    return;
  }
  
  searchTimer = setTimeout(() => {
    loadTxt.textContent = LANG === 'fr' ? 'Recherche...' : 'Searching...';
    loading.style.display = '';
    
    const currentType = document.getElementById('filterType').value;
    google.script.run
      .withSuccessHandler(results => {
        if (results.length > 0) {
          ud.innerHTML = results.map(u => {
            const safeEmail = escapeHtml(u.email);
            const safeLabel = escapeHtml(u.label);
            return '<option value="' + safeEmail + '" style="padding:4px 8px;">' + safeLabel + '</option>';
          }).join('');
          ud.style.display = 'block';
        } else {
          ud.style.display = 'none';
        }
        loading.style.display = 'none';
      })
      .withFailureHandler(() => { loading.style.display = 'none'; })
      .searchAdminDirectory(query, currentType);
  }, 400); // 400ms debounce
}

function runAudit() {
  const type  = document.getElementById('filterType').value;
  let value = '';

  if (type === 'user' || type === 'group') {
    value = document.getElementById('valueInput').value.trim();
    if (!value) {
      document.getElementById('valueInput').focus();
      return;
    }
  } else if (type !== 'all') {
    value = document.getElementById('valueSelect').value;
    if (!value) {
      document.getElementById('valueSelect').focus();
      return;
    }
  }

  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  btn.innerHTML =
    '<span class="spinner" style="border-top-color:#fff;border-color:rgba(255,255,255,0.3);"></span> ' +
    (LANG === 'fr' ? 'Audit en cours...' : 'Running...');

  google.script.run
    .withSuccessHandler(() => google.script.host.close())
    .withFailureHandler(err => {
      btn.disabled = false;
      btn.textContent = LANG === 'fr' ? "Lancer l'audit" : 'Run Audit';
      alert(err.message);
    })
    .runAuditDriveFiltered({ filterType: type, filterValue: value });
}

// Afficher la note "all" par défaut
onTypeChange('all');
<\/script>
</body>
</html>`)
    .setWidth(460).setHeight(380);

  SpreadsheetApp.getUi().showModalDialog(html,
    lang === 'fr' ? '📁 Audit Drive' : '📁 Drive Audit');
}

/**
 * Récupère les options disponibles pour les filtres Drive.
 * Appelé depuis le dialog via google.script.run.
 * Note: Les utilisateurs ne sont plus préchargés pour éviter les crashs sur les grands annuaires.
 * Les options sont mises en cache (CacheService) pour accélérer l'ouverture du dialog.
 * @returns {{ departments: string[], costCenters: string[], orgUnits: string[] }}
 */
function getDriveFilterOptions() {
  // Utilisation de getUserCache au lieu de getDocumentCache pour éviter les fuites de données
  const cache = CacheService.getUserCache();
  const cachedData = cache ? cache.get('DriveFilterOptions') : null;
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) { }
  }

  const domains = getDomains();
  const departments = new Set();
  const costCenters = new Set();
  const orgUnits = new Set();

  for (const domain of domains) {
    try {
      const users = _fetchUsers(domain);
      for (const user of users) {
        // Unités organisationnelles
        if (user.orgUnitPath && user.orgUnitPath !== '/') {
          orgUnits.add(user.orgUnitPath);
        }
        // Départements & centres de coût
        if (user.organizations) {
          for (const org of user.organizations) {
            if (org.department) departments.add(org.department);
            if (org.costCenter) costCenters.add(org.costCenter);
          }
        }
      }
    } catch (e) {
      logError('getDriveFilterOptions', e);
    }
  }

  const result = {
    departments: [...departments].sort(),
    costCenters: [...costCenters].sort(),
    orgUnits: [...orgUnits].sort(),
  };

  if (cache) {
    try {
      // Met en cache pour 6 heures (21600s)
      cache.put('DriveFilterOptions', JSON.stringify(result), 21600);
    } catch (e) {
      logError('getDriveFilterOptions-cache', e);
    }
  }

  return result;
}

/**
 * Recherche dynamique des utilisateurs ou groupes (autocomplete)
 * Appelé depuis le dialog via google.script.run
 * @param {string} query 
 * @param {string} type ('user' ou 'group')
 * @returns {{label:string, email:string}[]}
 */
function searchAdminDirectory(query, type) {
  if (!query || query.length < 2) return [];
  const results = [];
  const domains = getDomains();

  for (const domain of domains) {
    const cleanDomain = domain.trim().toLowerCase();
    try {
      if (type === 'user') {
        const resultsMap = new Map();
        try {
          const res1 = AdminDirectory.Users.list({ domain: cleanDomain, query: `name:'${query}*'`, maxResults: 10, fields: 'users(primaryEmail, name)' });
          if (res1.users) res1.users.forEach(u => resultsMap.set(u.primaryEmail, u));
        } catch (e) { logError('searchAdminDirectory-user-name', e); }

        try {
          const res2 = AdminDirectory.Users.list({ domain: cleanDomain, query: `email:'${query}*'`, maxResults: 10, fields: 'users(primaryEmail, name)' });
          if (res2.users) res2.users.forEach(u => resultsMap.set(u.primaryEmail, u));
        } catch (e) { logError('searchAdminDirectory-user-email', e); }

        for (const u of resultsMap.values()) {
          const fullName = [u.name && u.name.fullName].filter(Boolean).join(' ') || u.primaryEmail;
          results.push({ label: fullName, email: u.primaryEmail });
        }
      } else if (type === 'group') {
        const resultsMap = new Map();
        try {
          const res1 = AdminDirectory.Groups.list({ domain: cleanDomain, query: `name:'${query}*'`, maxResults: 10, fields: 'groups(email, name)' });
          if (res1.groups) res1.groups.forEach(g => resultsMap.set(g.email, g));
        } catch (e) { logError('searchAdminDirectory-group-name', e); }

        try {
          const res2 = AdminDirectory.Groups.list({ domain: cleanDomain, query: `email:'${query}*'`, maxResults: 10, fields: 'groups(email, name)' });
          if (res2.groups) res2.groups.forEach(g => resultsMap.set(g.email, g));
        } catch (e) { logError('searchAdminDirectory-group-email', e); }

        // Fallback si 0 groupe trouvé (ou erreur)
        if (resultsMap.size === 0) {
          try {
            const res3 = AdminDirectory.Groups.list({ customer: 'my_customer', query: `name:'${query}*'`, maxResults: 10, fields: 'groups(email, name)' });
            if (res3.groups) {
              res3.groups.forEach(g => {
                if (g.email && g.email.toLowerCase().endsWith('@' + cleanDomain)) resultsMap.set(g.email, g);
              });
            }
          } catch (e) { logError('searchAdminDirectory-group-name-fallback', e); }

          try {
            const res4 = AdminDirectory.Groups.list({ customer: 'my_customer', query: `email:'${query}*'`, maxResults: 10, fields: 'groups(email, name)' });
            if (res4.groups) {
              res4.groups.forEach(g => {
                if (g.email && g.email.toLowerCase().endsWith('@' + cleanDomain)) resultsMap.set(g.email, g);
              });
            }
          } catch (e) { logError('searchAdminDirectory-group-email-fallback', e); }
        }

        for (const g of resultsMap.values()) {
          results.push({ label: `${g.name} (${g.email})`, email: g.email });
        }
      }
    } catch (e) {
      logError('searchAdminDirectory', e);
    }
  }
  return results;
}

/**
 * Lance l'audit Drive avec un filtre.
 * Appelé depuis le dialog HTML via google.script.run.
 * @param {{ filterType: string, filterValue: string }} filterOpts
 */
function runAuditDriveFiltered(filterOpts) {
  auditDrive(filterOpts);
}

/**
 * Lance l'audit Drive (sans filtre = tout le domaine).
 * Pour compatibilité avec le menu direct.
 */
function runAuditDrive() {
  showDriveFilterDialog();
}

/**
 * Lance l'audit Drive.
 * @param {{ filterType?: string, filterValue?: string }} [filterOpts]
 */
function auditDrive(filterOpts) {
  const tr = t();
  const ss = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.DRIVE);
  const filter = filterOpts || { filterType: 'all', filterValue: '' };

  showToast(tr.loading, tr.menu_drive, 30);

  const headers = [
    tr.col_domain,
    getLang() === 'fr' ? 'Périmètre' : 'Scope',
    tr.col_file_name,
    tr.col_file_location,
    tr.col_file_owner,
    tr.col_file_type,
    tr.col_sharing_type,
    tr.col_shared_with,
    tr.col_last_modified,
    tr.col_file_url,
  ];

  const scopeLabel = _scopeLabel(filter, tr);
  prepareSheet(sheet, headers, `${SHEETS.DRIVE} — ${scopeLabel}`);

  const domains = getDomains();
  const allRows = [];
  const metrics = { externalShares: 0, publicFiles: 0, totalFiles: 0 };

  // Cache des Shared Drives pour afficher l'emplacement
  const sharedDrives = _getSharedDrivesMap();

  // Détermine la liste d'emails à auditer
  let targetEmails = null; // null = tous les fichiers visibles

  if (filter.filterType === 'user') {
    targetEmails = [filter.filterValue];
  } else if (filter.filterType === 'group') {
    targetEmails = _fetchGroupMembers(filter.filterValue);
  } else if (filter.filterType !== 'all') {
    // Récupère les utilisateurs correspondant au filtre
    targetEmails = [];
    for (const domain of domains) {
      try {
        const users = _fetchUsers(domain);
        const filtered = users.filter(u => _matchesFilter(u, filter));
        targetEmails.push(...filtered.map(u => u.primaryEmail));
      } catch (e) { logError('auditDrive-filterUsers', e); }
    }
  }

  for (const domain of domains) {
    try {
      const files = targetEmails !== null
        ? _fetchSharedFilesForUsers(targetEmails)
        : _fetchSharedFiles();

      metrics.totalFiles += files.length;

      for (const file of files) {
        const sharingType = _getSharingType(file, domain);
        if (!sharingType) continue;

        metrics.externalShares++;
        if (sharingType === 'anyone') metrics.publicFiles++;

        const location = file.driveId
          ? `🏢 ${sharedDrives[file.driveId] || 'Shared Drive'}`
          : `👤 ${getLang() === 'fr' ? 'Mon Drive' : 'My Drive'}`;

        allRows.push([
          domain,
          scopeLabel,
          truncate(file.name || '', 80),
          location,
          file.owners ? file.owners.map(o => o.emailAddress).join(', ') : '—',
          _mimeLabel(file.mimeType),
          _sharingTypeLabel(sharingType, tr),
          _getSharedWithLabel(file, domain, tr),
          formatDate(file.modifiedTime),
          file.webViewLink || '',
        ]);
      }
    } catch (err) {
      logError('auditDrive', err);
      allRows.push([domain, scopeLabel, `❌ ${err.message}`, '', '', '', '', '', '']);
    }
  }

  const colDefs = [
    {},               // domain
    {},               // scope
    {},               // filename
    {},               // location
    {},               // owner
    {},               // type
    { type: 'risk' }, // sharing type
    {},               // shared with
    {},               // last modified
    { type: 'url' },  // url
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('drive', metrics);

  const lang = getLang();
  showToast(
    `${tr.done} — ${allRows.length} ${lang === 'fr' ? 'fichiers à risque' : 'at-risk files'} | ${scopeLabel}`,
    tr.menu_drive
  );
  return metrics;
}

// ── Helpers filtre ────────────────────────────────────────────

/**
 * Construit le libellé de périmètre pour l'affichage.
 */
function _scopeLabel(filter, tr) {
  const lang = getLang();
  if (!filter || filter.filterType === 'all') {
    return lang === 'fr' ? '🌍 Domaine complet' : '🌍 Full domain';
  }
  const typeLabels = {
    fr: { user: '👤', group: '👥 Grp.', department: '🏢 Dép.', costCenter: '💰 CC', orgUnit: '🗂 OU' },
    en: { user: '👤', group: '👥 Grp.', department: '🏢 Dept.', costCenter: '💰 CC', orgUnit: '🗂 OU' },
  };
  const lbl = (typeLabels[lang] || typeLabels.fr)[filter.filterType] || filter.filterType;
  return `${lbl} ${filter.filterValue}`;
}

/**
 * Vérifie si un utilisateur correspond au filtre actif.
 * @param {Object} user  Objet utilisateur Admin SDK
 * @param {{ filterType: string, filterValue: string }} filter
 * @returns {boolean}
 */
function _matchesFilter(user, filter) {
  switch (filter.filterType) {
    case 'orgUnit':
      return user.orgUnitPath === filter.filterValue;
    case 'department':
      return (user.organizations || []).some(o => o.department === filter.filterValue);
    case 'costCenter':
      return (user.organizations || []).some(o => o.costCenter === filter.filterValue);
    default:
      return false;
  }
}

/**
 * Récupère tous les emails membres d'un groupe (utilisateurs internes uniquement).
 * @param {string} groupEmail
 * @returns {string[]}
 */
function _fetchGroupMembers(groupEmail) {
  if (!groupEmail) return [];
  const members = [];
  let pageToken = null;
  try {
    do {
      const res = AdminDirectory.Members.list(groupEmail, {
        maxResults: 200,
        pageToken: pageToken,
        fields: 'nextPageToken, members(email, type)'
      });
      if (res.members) {
        // Uniquement les vrais utilisateurs (pas les sous-groupes ou membres externes non identifiés)
        members.push(...res.members.filter(m => m.type === 'USER').map(m => m.email));
      }
      pageToken = res.nextPageToken;
    } while (pageToken);
  } catch (e) {
    logError('_fetchGroupMembers', e);
  }
  return members;
}

/**
 * Récupère les fichiers partagés pour une liste d'utilisateurs.
 * Utilise un filtre sur le propriétaire dans la requête Drive.
 * @param {string[]} emails
 * @returns {Object[]}
 */
function _fetchSharedFilesForUsers(emails) {
  if (!emails || emails.length === 0) return [];

  const results = [];
  // Découpe en groupes de 20 pour éviter des requêtes trop longues
  const CHUNK = 20;

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    // Recherche les fichiers dont l'utilisateur est propriétaire OU créateur (ex: Shared Drives)
    const ownerQ = chunk.map(e => `('${e}' in owners OR '${e}' in creators)`).join(' OR ');
    const sharingQ = `visibility='anyoneWithLink' OR visibility='anyoneCanFind'`;
    const query = `(${ownerQ}) AND (${sharingQ})`;

    let pageToken = null;
    do {
      const params = {
        q: query,
        fields: 'nextPageToken, files(id, name, mimeType, owners, permissions(type, emailAddress, role, deleted), modifiedTime, webViewLink, shared)',
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };
      if (pageToken) params.pageToken = pageToken;
      try {
        const resp = Drive.Files.list(params);
        if (resp.files) results.push(...resp.files);
        pageToken = resp.nextPageToken;
      } catch (e) {
        logError('_fetchSharedFilesForUsers', e);
        break;
      }
    } while (pageToken && results.length < 5000);
  }

  return results;
}

/**
 * Récupère tous les fichiers partagés visibles (mode "all").
 * @returns {Object[]}
 */
function _fetchSharedFiles() {
  const results = [];
  let pageToken = null;
  const query = "visibility='anyoneWithLink' OR visibility='anyoneCanFind'";

  do {
    const params = {
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, owners, permissions(type, emailAddress, role, deleted), modifiedTime, webViewLink, shared)',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };
    if (pageToken) params.pageToken = pageToken;
    try {
      const response = Drive.Files.list(params);
      if (response.files) results.push(...response.files);
      pageToken = response.nextPageToken;
    } catch (e) {
      logError('_fetchSharedFiles', e);
      break;
    }
  } while (pageToken && results.length < 2000);

  return results;
}

/**
 * Récupère la liste des Shared Drives du domaine pour faire la correspondance ID -> Nom.
 * @returns {Object.<string, string>}
 */
function _getSharedDrivesMap() {
  const map = {};
  let pageToken = null;
  try {
    do {
      const res = Drive.Drives.list({
        pageSize: 100,
        pageToken: pageToken,
        useDomainAdminAccess: true,
        fields: 'nextPageToken, drives(id, name)'
      });
      if (res.drives) {
        res.drives.forEach(d => { map[d.id] = d.name; });
      }
      pageToken = res.nextPageToken;
    } while (pageToken);
  } catch (e) {
    logError('_getSharedDrivesMap', e);
  }
  return map;
}

/**
 * Détermine le type de partage à risque d'un fichier.
 */

function _getSharingType(file, domain) {
  if (!file.permissions) return null;
  for (const perm of file.permissions) {
    // On ignore les bloqueurs d'héritage (rôle 'none') et les permissions supprimées
    if (perm.deleted === true || perm.role === 'none') {
      continue;
    }
    
    if (perm.type === 'anyone') return 'anyone';
    if (perm.type === 'user'  && perm.emailAddress && !perm.emailAddress.endsWith('@' + domain)) return 'external';
    if (perm.type === 'group' && perm.emailAddress && !perm.emailAddress.endsWith('@' + domain)) return 'external';
  }
  return null;
}

/**
 * Label du type de partage.
 */
function _sharingTypeLabel(type, tr) {
  const map = {
    anyone: `🚨 ${tr.status_anyone}`,
    external: `⚠️ ${tr.status_external}`,
    domain: `ℹ️ ${tr.status_domain}`,
  };
  return map[type] || type;
}

/**
 * Label des personnes avec qui le fichier est partagé.
 */
function _getSharedWithLabel(file, domain, tr) {
  if (!file.permissions) return '—';
  const external = file.permissions
    .filter(p => p.type === 'anyone' || (p.emailAddress && !p.emailAddress.endsWith('@' + domain)))
    .map(p => p.emailAddress || p.type)
    .slice(0, 5);
  return external.join(', ') || '—';
}

/**
 * Traduit un MIME type en libellé lisible.
 */
function _mimeLabel(mime) {
  const lang = getLang();
  const map = {
    'application/vnd.google-apps.document': lang === 'fr' ? 'Document' : 'Doc',
    'application/vnd.google-apps.spreadsheet': lang === 'fr' ? 'Tableur' : 'Sheet',
    'application/vnd.google-apps.presentation': lang === 'fr' ? 'Présentation' : 'Slides',
    'application/vnd.google-apps.form': 'Form',
    'application/vnd.google-apps.folder': lang === 'fr' ? 'Dossier' : 'Folder',
    'application/vnd.google-apps.script': 'Apps Script',
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  };
  if (!mime) return '—';
  if (map[mime]) return map[mime];
  const parts = mime.split('/');
  return parts[parts.length - 1] || mime;
}
