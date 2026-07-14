/**
 * ============================================================
 * Utils.gs — Fonctions utilitaires partagées
 * ============================================================
 */

/**
 * Formate une date ISO en chaîne lisible selon la langue.
 * @param {string|Date} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return '—';
  try {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const lang = getLang();
    const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
    return Utilities.formatDate(d, Session.getScriptTimeZone(),
      lang === 'fr' ? 'dd/MM/yyyy HH:mm' : 'yyyy-MM-dd HH:mm');
  } catch(e) {
    return String(value);
  }
}

/**
 * Calcule le nombre de jours entre une date et aujourd'hui.
 * @param {string|Date} dateValue
 * @returns {number} Nombre de jours (positif = dans le passé)
 */
function daysSince(dateValue) {
  if (!dateValue) return 9999;
  try {
    const d = (dateValue instanceof Date) ? dateValue : new Date(dateValue);
    if (isNaN(d.getTime())) return 9999;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  } catch(e) {
    return 9999;
  }
}

/**
 * Affiche un toast de notification dans Google Sheets.
 * @param {string} message
 * @param {string} [title]
 * @param {number} [timeout=4]
 */
function showToast(message, title, timeout) {
  try {
    SpreadsheetApp.getActiveSpreadsheet()
      .toast(message, title || t().menu_title, timeout || 4);
  } catch(e) {}
}

/**
 * Affiche une alerte modale.
 * @param {string} message
 */
function showAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch(e) {}
}

/**
 * Détermine le niveau de risque (OK / WARNING / DANGER) basé sur un score.
 * @param {number} score  0-100
 * @returns {'ok'|'warning'|'danger'}
 */
function riskLevel(score) {
  if (score <= 30) return 'ok';
  if (score <= 65) return 'warning';
  return 'danger';
}

/**
 * Retourne la couleur correspondant à un niveau de risque.
 * @param {'ok'|'warning'|'danger'} level
 * @returns {string} HEX color
 */
function riskColor(level) {
  const map = { ok: COLORS.OK, warning: COLORS.WARNING, danger: COLORS.DANGER };
  return map[level] || COLORS.INFO;
}

/**
 * Génère l'icône statut texte selon un booléen.
 * @param {boolean} val
 * @param {boolean} [invertRisk=false]  Si true, true = bon signe
 * @returns {string}
 */
function boolIcon(val, invertRisk) {
  const tr = t();
  if (invertRisk) return val ? tr.status_yes : tr.status_no;
  return val ? tr.status_yes : tr.status_no;
}

/**
 * Tronque un texte à une longueur max.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max - 1) + '…' : text;
}

/**
 * Récupère ou crée une feuille par son nom.
 * Si la feuille n'existe pas elle est créée.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Calcule un score de risque global basé sur les métriques d'audit.
 * Retourne un entier entre 0 et 100.
 * @param {Object} metrics
 * @returns {number}
 */
function computeRiskScore(metrics) {
  let score = 0;
  const total = metrics.totalUsers || 1;

  // Ratio d'inactifs
  score += Math.min(20, Math.round((metrics.inactiveUsers / total) * 40));
  // Ratio sans 2FA
  score += Math.min(25, Math.round((metrics.no2faUsers / total) * 50));
  // Fichiers partagés ext.
  score += Math.min(20, metrics.externalShares > 50 ? 20 : Math.round(metrics.externalShares * 0.4));
  // Apps OAuth tierces
  score += Math.min(15, metrics.oauthApps > 30 ? 15 : Math.round(metrics.oauthApps * 0.5));
  // Connexions échouées
  score += Math.min(20, metrics.failedLogins > 100 ? 20 : Math.round(metrics.failedLogins * 0.2));

  return Math.min(100, score);
}

/**
 * Convertit une valeur booléenne Google API en texte lisible.
 * @param {*} val
 * @returns {string}
 */
function yesNo(val) {
  const tr = t();
  return val ? tr.status_yes : tr.status_no;
}

/**
 * Construit une liste de pages pour une API paginée.
 * Retourne la liste complète des items en gérant nextPageToken.
 * @param {Function} fetchFn  Fonction(pageToken) → {items: [], nextPageToken: ''}
 * @returns {Array}
 */
function fetchAllPages(fetchFn) {
  const results = [];
  let pageToken = null;
  do {
    const page = fetchFn(pageToken);
    if (page && page.items) results.push(...page.items);
    pageToken = page ? page.nextPageToken : null;
  } while (pageToken);
  return results;
}

/**
 * Exécute une fonction avec reprise automatique en cas d'erreur de quota (Rate Limit 429).
 * @param {Function} fn La fonction à exécuter
 * @param {number} [maxRetries=4] Nombre maximum de tentatives
 * @returns {*}
 */
function exponentialBackoff(fn, maxRetries = 4) {
  let retries = 0;
  while (true) {
    try {
      return fn();
    } catch (e) {
      if (retries >= maxRetries) {
        throw e;
      }
      
      const errMsg = e.message ? e.message.toLowerCase() : String(e).toLowerCase();
      // Si l'erreur est liée au quota ou au taux (429, rate limit, quota)
      if (errMsg.includes('quota') || errMsg.includes('rate limit') || errMsg.includes('429') || errMsg.includes('backend error') || errMsg.includes('503')) {
        retries++;
        const waitTime = Math.pow(2, retries) * 1000 + Math.floor(Math.random() * 1000);
        Utilities.sleep(waitTime);
      } else {
        // Erreur non liée au quota (ex: 403 Forbidden, 404 Not Found), on lève immédiatement
        throw e;
      }
    }
  }
}

/**
 * Log une erreur dans la console Apps Script (Stackdriver) et dans l'onglet 'Debug Logs'.
 * @param {string} context
 * @param {Error} err
 */
function logError(context, err) {
  const msg = `${context}: ${err.message || err}`;
  console.error(`[WorkspaceAudit] ${msg}`);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      let sheet = ss.getSheetByName('Debug Logs');
      if (!sheet) {
        sheet = ss.insertSheet('Debug Logs');
        sheet.appendRow(['Timestamp', 'Context', 'Error Message']);
      }
      sheet.appendRow([new Date(), context, String(err.message || err)]);
    }
  } catch(e) {}
}

/**
 * Retourne la date/heure courante formatée pour affichage.
 * @returns {string}
 */
function now() {
  return formatDate(new Date());
}
