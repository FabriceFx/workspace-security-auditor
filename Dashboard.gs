/**
 * ============================================================
 * Dashboard.gs — Tableau de bord global
 * ============================================================
 */

/**
 * Construit ou rafraîchit le tableau de bord.
 * Lance tous les audits en séquence, puis affiche le résumé.
 */
function runDashboard() {
  const tr = t();
  const ss = getSS();

  showToast(tr.audit_running, tr.menu_title, 60);

  // Lance tous les audits et collecte les métriques
  let mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices, mDNS;
  try { mUsers    = auditUsers();         } catch(e) { mUsers    = {}; logError('dashboard-users', e);    }
  try { mGroups   = auditGroups();        } catch(e) { mGroups   = {}; logError('dashboard-groups', e);   }
  try { mDrive    = auditDrive();         } catch(e) { mDrive    = {}; logError('dashboard-drive', e);    }
  try { mSecurity = auditSecurity();      } catch(e) { mSecurity = {}; logError('dashboard-security', e); }
  try { auditLogs();                      } catch(e) { logError('dashboard-logs', e);                     }
  try { mLogin    = auditLoginActivity(); } catch(e) { mLogin    = {}; logError('dashboard-login', e);    }
  try { mDevices  = auditDevices();       } catch(e) { mDevices  = {}; logError('dashboard-devices', e);  }
  try { mDNS      = auditDNS();           } catch(e) { mDNS      = {}; logError('dashboard-dns', e);      }

  // Construit le dashboard
  _buildDashboard(ss, tr, { mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices, mDNS });

  // Réorganise les onglets
  moveDashboardFirst(ss);

  showToast(tr.audit_done, tr.menu_title, 5);
}

/**
 * Construit la feuille Dashboard avec KPIs et résumé.
 * @param {Spreadsheet} ss
 * @param {Object} tr
 * @param {Object} metrics
 */
function _buildDashboard(ss, tr, metrics) {
  const sheet = getOrCreateSheet(ss, SHEETS.DASHBOARD);
  sheet.clearContents();
  sheet.clearFormats();
  sheet.setTabColor('#1a1a2e');

  const domains   = getDomains();
  const numCols   = 12;
  const m = {
    totalUsers    : metrics.mUsers?.totalUsers    || 0,
    inactiveUsers : metrics.mUsers?.inactiveUsers || 0,
    no2faUsers    : metrics.mUsers?.no2faUsers    || 0,
    suspendedUsers: metrics.mUsers?.suspendedUsers || 0,
    adminUsers    : metrics.mUsers?.adminUsers    || 0,
    totalGroups   : metrics.mGroups?.totalGroups  || 0,
    externalShares: metrics.mDrive?.externalShares || 0,
    publicFiles   : metrics.mDrive?.publicFiles   || 0,
    oauthApps     : metrics.mSecurity?.oauthApps  || 0,
    failedLogins  : metrics.mLogin?.failedLogins  || 0,
    totalLogins   : metrics.mLogin?.totalLogins   || 0,
    totalDevices  : metrics.mDevices?.totalDevices || 0,
    nonCompliant  : metrics.mDevices?.nonCompliant || 0,
    missingSpf    : metrics.mDNS?.missingSpf       || 0,
    missingDmarc  : metrics.mDNS?.missingDmarc     || 0,
  };

  // Calcul du score de risque global
  const riskScore = computeRiskScore({
    totalUsers    : m.totalUsers,
    inactiveUsers : m.inactiveUsers,
    no2faUsers    : m.no2faUsers,
    externalShares: m.externalShares,
    oauthApps     : m.oauthApps,
    failedLogins  : m.failedLogins,
    missingSpf    : m.missingSpf,
    missingDmarc  : m.missingDmarc,
  });
  const riskLvl = riskLevel(riskScore);

  // ── Titre principal ──────────────────────────────────────────
  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue('🔍 ' + tr.dash_title)
    .setBackground(COLORS.HEADER_BG)
    .setFontColor('#ffffff')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 48);

  // ── Sous-titre : domaines + date ────────────────────────────
  const subtitle = `${tr.dash_domain}: ${domains.join(' · ')} — ${tr.dash_last_audit}: ${now()}`;
  sheet.getRange(2, 1, 1, numCols).merge()
    .setValue(subtitle)
    .setBackground('#0f3460')
    .setFontColor('#a0c4e8')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setFontStyle('italic');
  sheet.setRowHeight(2, 24);

  // ── Score de risque global ────────────────────────────────
  sheet.getRange(3, 1, 1, numCols).merge()
    .setValue(`${tr.dash_risk_score}: ${riskScore}/100 — ${tr.status_ok.replace('✅', '').replace('⚠️','').replace('🚨','').trim()}`)
    .setBackground(riskColor(riskLvl))
    .setFontColor('#ffffff')
    .setFontSize(13)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(3, 30);

  // ── Ligne vide séparateur ────────────────────────────────────
  sheet.setRowHeight(4, 16);

  // ── Sections de KPIs ──────────────────────────────────────
  // Chaque KPI = 4 lignes de hauteur (label + valeur)
  _writeSectionTitle(sheet, 5, numCols, getLang() === 'fr' ? '👤 Utilisateurs' : '👤 Users');
  sheet.setRowHeight(5, 28);

  const kpiRow = 6;
  const kpiConfigs = [
    { label: tr.dash_total_users,  value: m.totalUsers,     level: 'info',    col: 1 },
    { label: tr.dash_inactive_users, value: m.inactiveUsers,
      level: m.inactiveUsers > 0 ? (m.inactiveUsers > m.totalUsers * 0.2 ? 'danger' : 'warning') : 'ok', col: 3 },
    { label: tr.dash_no_2fa,       value: m.no2faUsers,
      level: m.no2faUsers > 0 ? (m.no2faUsers > m.totalUsers * 0.3 ? 'danger' : 'warning') : 'ok', col: 5 },
    { label: getLang() === 'fr' ? 'Admins' : 'Admins', value: m.adminUsers, level: 'info', col: 7 },
    { label: getLang() === 'fr' ? 'Suspendus' : 'Suspended', value: m.suspendedUsers,
      level: m.suspendedUsers > 0 ? 'warning' : 'ok', col: 9 },
    { label: getLang() === 'fr' ? 'Groupes' : 'Groups', value: m.totalGroups, level: 'info', col: 11 },
  ];

  kpiConfigs.forEach(kpi => {
    writeKpiCell(sheet, kpiRow, kpi.col, kpi.label, kpi.value, kpi.level);
    sheet.setRowHeight(kpiRow, 28);
    sheet.setRowHeight(kpiRow + 1, 24);
    sheet.setRowHeight(kpiRow + 2, 36);
    sheet.setRowHeight(kpiRow + 3, 28);
  });

  // ── Section Sécurité, Drive & DNS ─────────────────────────────
  const secRow = kpiRow + 5;
  _writeSectionTitle(sheet, secRow, numCols, getLang() === 'fr' ? '🔐 Sécurité, Drive & DNS' : '🔐 Security, Drive & DNS');
  sheet.setRowHeight(secRow, 28);

  const secConfigs = [
    { label: tr.dash_shared_ext,   value: m.externalShares,
      level: m.externalShares > 50 ? 'danger' : (m.externalShares > 10 ? 'warning' : 'ok'), col: 1 },
    { label: getLang() === 'fr' ? 'Fichiers Publics' : 'Public Files', value: m.publicFiles,
      level: m.publicFiles > 0 ? (m.publicFiles > 10 ? 'danger' : 'warning') : 'ok', col: 3 },
    { label: tr.dash_oauth_apps,   value: m.oauthApps,
      level: m.oauthApps > m.totalUsers * 2 ? 'warning' : 'info', col: 5 },
    { label: tr.dash_failed_logins,value: m.failedLogins,
      level: m.failedLogins > 10 ? 'danger' : (m.failedLogins > 0 ? 'warning' : 'ok'), col: 7 },
    { label: getLang() === 'fr' ? 'Sans SPF' : 'Missing SPF', value: m.missingSpf,
      level: m.missingSpf > 0 ? 'danger' : 'ok', col: 9 },
    { label: getLang() === 'fr' ? 'Sans DMARC' : 'Missing DMARC', value: m.missingDmarc,
      level: m.missingDmarc > 0 ? 'danger' : 'ok', col: 11 },
  ];

  const kpiRow2 = secRow + 1;
  secConfigs.forEach(kpi => {
    writeKpiCell(sheet, kpiRow2, kpi.col, kpi.label, kpi.value, kpi.level);
    sheet.setRowHeight(kpiRow2, 28);
    sheet.setRowHeight(kpiRow2 + 1, 24);
    sheet.setRowHeight(kpiRow2 + 2, 36);
    sheet.setRowHeight(kpiRow2 + 3, 28);
  });

  // ── Score de risque visuel ────────────────────────────────
  const scoreRow = kpiRow2 + 5;
  _writeSectionTitle(sheet, scoreRow, numCols, getLang() === 'fr' ? '📊 Score de risque global' : '📊 Global Risk Score');
  sheet.setRowHeight(scoreRow, 28);

  _writeRiskBar(sheet, scoreRow + 1, numCols, riskScore, riskLvl, tr);

  // ── Légendes ─────────────────────────────────────────────
  const legendRow = scoreRow + 5;
  _writeLegend(sheet, legendRow, tr);

  // Largeur colonnes dashboard (paires de 2)
  for (let c = 1; c <= numCols; c++) {
    sheet.setColumnWidth(c, c % 2 === 0 ? 10 : 120);
  }
  sheet.setFrozenRows(3);

  // Couleur de l'onglet selon niveau de risque
  const tabColors = { ok: '#27ae60', warning: '#f39c12', danger: '#e74c3c' };
  sheet.setTabColor(tabColors[riskLvl] || '#1a1a2e');
}

/**
 * Écrit un titre de section.
 */
function _writeSectionTitle(sheet, row, numCols, label) {
  sheet.getRange(row, 1, 1, numCols).merge()
    .setValue(label)
    .setBackground('#16213e')
    .setFontColor('#e2e8f0')
    .setFontSize(11)
    .setFontWeight('bold')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');
  // Indentation
  sheet.getRange(row, 1).setValue('   ' + label);
}

/**
 * Écrit une barre visuelle du score de risque.
 */
function _writeRiskBar(sheet, row, numCols, score, level, tr) {
  const filled = Math.round((score / 100) * numCols);
  const barColor = riskColor(level);
  const emptyColor = '#e8eaed';

  for (let c = 1; c <= numCols; c++) {
    sheet.getRange(row, c)
      .setBackground(c <= filled ? barColor : emptyColor);
    sheet.setRowHeight(row, 20);
  }

  // Label du score
  sheet.getRange(row + 1, 1, 1, numCols).merge()
    .setValue(`${score}/100 — ${_riskLabel(level, tr)}`)
    .setFontColor(barColor)
    .setFontSize(14)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(row + 1, 28);
}

/**
 * Retourne le libellé du niveau de risque.
 */
function _riskLabel(level, tr) {
  const lang = getLang();
  const map = {
    ok      : lang === 'fr' ? '✅ Risque faible'   : '✅ Low Risk',
    warning : lang === 'fr' ? '⚠️ Risque modéré'   : '⚠️ Moderate Risk',
    danger  : lang === 'fr' ? '🚨 Risque élevé'    : '🚨 High Risk',
  };
  return map[level] || level;
}

/**
 * Écrit la légende des couleurs.
 */
function _writeLegend(sheet, row, tr) {
  const lang = getLang();
  sheet.getRange(row, 1, 1, 4).merge()
    .setValue(`✅ ${lang === 'fr' ? 'OK / Sûr' : 'OK / Safe'}`)
    .setBackground('#eafaf1').setFontColor(COLORS.OK).setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(row, 5, 1, 4).merge()
    .setValue(`⚠️ ${lang === 'fr' ? 'Avertissement' : 'Warning'}`)
    .setBackground('#fef9e7').setFontColor(COLORS.WARNING).setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(row, 9, 1, 4).merge()
    .setValue(`🚨 ${lang === 'fr' ? 'Danger / Critique' : 'Danger / Critical'}`)
    .setBackground('#fdecea').setFontColor(COLORS.DANGER).setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(row, 24);
}
