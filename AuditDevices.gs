/**
 * ============================================================
 * AuditDevices.gs — Audit des appareils mobiles
 * ============================================================
 */

/**
 * Lance l'audit des appareils mobiles inscrits dans MDM.
 * Remplit la feuille SHEETS.DEVICES.
 */
function auditDevices() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.DEVICES);

  showToast(tr.loading, tr.menu_devices, 15);

  const headers = [
    tr.col_domain,
    tr.col_device_user,
    tr.col_device_name,
    tr.col_device_model,
    tr.col_device_os,
    tr.col_device_status,
    tr.col_device_encrypted,
    tr.col_device_sync,
    tr.col_device_serial,
  ];

  prepareSheet(sheet, headers, `${SHEETS.DEVICES} — ${tr.dash_domain}`);

  const domains = getDomains();
  const allRows = [];
  const metrics = { totalDevices: 0, nonCompliant: 0, unencrypted: 0 };

  for (const domain of domains) {
    try {
      const devices = _fetchMobileDevices(domain);
      metrics.totalDevices += devices.length;

      for (const device of devices) {
        const encrypted  = device.encryptionStatus === 'ENCRYPTED';
        const status     = _deviceStatus(device.status, tr);
        const isCompliant = device.status === 'APPROVED' && encrypted;

        if (!isCompliant) metrics.nonCompliant++;
        if (!encrypted)   metrics.unencrypted++;

        allRows.push([
          domain,
          (device.email || []).join(', ') || '—',
          device.name     || device.deviceId || '—',
          device.model    || '—',
          `${device.os || ''} ${device.osVersion || ''}`.trim() || '—',
          status,
          yesNo(encrypted),
          formatDate(device.lastSync),
          device.serialNumber || '—',
        ]);
      }
    } catch (err) {
      logError('auditDevices', err);
      allRows.push([domain, `❌ ${err.message}`, '', '', '', '', '', '', '']);
    }
  }

  const colDefs = [
    {},                       // domain
    {},                       // user
    {},                       // device name
    {},                       // model
    {},                       // os
    { type: 'risk' },         // status
    { type: 'bool_good' },    // encrypted (bon si oui)
    {},                       // last sync
    {},                       // serial
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('devices', metrics);

  showToast(`${tr.done} — ${metrics.totalDevices} ${tr.menu_devices.replace(/[^ ]+\s/, '')}`, tr.menu_devices);
  return metrics;
}

/**
 * Récupère tous les appareils mobiles d'un domaine.
 * @param {string} domain  (Non utilisé directement dans l'API, customerId = 'my_customer')
 * @returns {Object[]}
 */
function _fetchMobileDevices(domain) {
  const results  = [];
  let pageToken  = null;

  do {
    const params = {
      customerId: 'my_customer',
      maxResults: 100,
      projection: 'FULL',
    };
    if (pageToken) params.pageToken = pageToken;

    try {
      const response = AdminDirectory.Mobiledevices.list('my_customer', params);
      if (response.mobiledevices) results.push(...response.mobiledevices);
      pageToken = response.nextPageToken;
    } catch(e) {
      logError('_fetchMobileDevices', e);
      break;
    }
  } while (pageToken);

  return results;
}

/**
 * Traduit le statut MDM d'un appareil.
 * @param {string} status
 * @param {Object} tr
 * @returns {string}
 */
function _deviceStatus(status, tr) {
  const lang = getLang();
  const map = {
    'APPROVED'          : `✅ ${lang === 'fr' ? 'Approuvé'   : 'Approved'}`,
    'PENDING'           : `⚠️ ${lang === 'fr' ? 'En attente' : 'Pending'}`,
    'BLOCKED'           : `🚨 ${lang === 'fr' ? 'Bloqué'     : 'Blocked'}`,
    'ACCOUNT_DELETED'   : `🚨 ${lang === 'fr' ? 'Compte supprimé' : 'Account deleted'}`,
    'DELETED'           : `🚨 ${lang === 'fr' ? 'Supprimé'   : 'Deleted'}`,
    'WIPED'             : `🚨 ${lang === 'fr' ? 'Effacé'     : 'Wiped'}`,
    'UNENROLLED'        : `⚠️ ${lang === 'fr' ? 'Non inscrit' : 'Unenrolled'}`,
    'UNKNOWN'           : `⚠️ ${lang === 'fr' ? 'Inconnu'    : 'Unknown'}`,
  };
  return map[status] || status || '—';
}
