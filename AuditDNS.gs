/**
 * ============================================================
 * AuditDNS.gs — Audit de sécurité Email (SPF / DMARC)
 * ============================================================
 */

/**
 * Lance l'audit DNS pour vérifier SPF et DMARC via DNS-over-HTTPS.
 */
function auditDNS() {
  const tr    = t();
  const ss    = getSS();
  const sheet = getOrCreateSheet(ss, SHEETS.DNS);

  showToast(tr.loading, tr.menu_dns, 20);

  const headers = [
    tr.col_domain,
    tr.col_dns_record,
    tr.col_dns_value,
    tr.col_dns_status
  ];

  prepareSheet(sheet, headers, `${SHEETS.DNS} — ${tr.dash_domain}`);

  const domains = getDomains();
  let allRows = [];
  const metrics = { missingSpf: 0, missingDmarc: 0, secureDomains: 0 };

  let actualDomains = [];
  for (const d of domains) {
    if (d === '*' || d === 'my_customer') {
      try {
        const domainList = AdminDirectory.Domains.list('my_customer');
        if (domainList.domains) {
          actualDomains.push(...domainList.domains.map(dom => dom.domainName));
        }
      } catch(e) {
        allRows.push(['*', 'Erreur', 'Impossible de récupérer la liste des domaines: ' + e.message, 'Non applicable']);
      }
    } else {
      actualDomains.push(d);
    }
  }
  
  // Supprimer les doublons
  actualDomains = [...new Set(actualDomains)];

  for (const domain of actualDomains) {

    let isSecure = true;

    // 1. Vérification SPF
    let spfVal = 'Non trouvé';
    let spfStatus = '⚠️ Critique (Aucun SPF)';
    try {
      const spfResp = UrlFetchApp.fetch(`https://dns.google/resolve?name=${domain}&type=TXT`, {muteHttpExceptions: true});
      const spfData = JSON.parse(spfResp.getContentText());
      const isDNSSEC = spfData.AD === true;
      if (spfData.Answer) {
        for (const ans of spfData.Answer) {
          const txt = ans.data;
          if (txt.includes('v=spf1')) {
            spfVal = txt;
            if (txt.includes('-all')) {
              spfStatus = isDNSSEC ? '✅ Sécurisé (Hard Fail)' : '✅ Sécurisé (Hard Fail) [Non-DNSSEC]';
            } else if (txt.includes('~all')) {
              spfStatus = '⚠️ Faible (Soft Fail)';
              isSecure = false;
            } else {
              spfStatus = '❌ Critique (Passoire)';
              isSecure = false;
            }
            break;
          }
        }
      }
    } catch (e) {
      logError('auditDNS-SPF', e);
    }
    
    if (spfVal === 'Non trouvé') {
      isSecure = false;
      metrics.missingSpf++;
    }

    allRows.push([domain, 'SPF', spfVal, spfStatus]);

    // 2. Vérification DMARC
    let dmarcVal = 'Non trouvé';
    let dmarcStatus = '⚠️ Critique (Aucun DMARC)';
    try {
      const dmarcResp = UrlFetchApp.fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`, {muteHttpExceptions: true});
      const dmarcData = JSON.parse(dmarcResp.getContentText());
      const isDNSSEC = dmarcData.AD === true;
      if (dmarcData.Answer) {
        for (const ans of dmarcData.Answer) {
          const txt = ans.data;
          if (txt.includes('v=DMARC1')) {
            dmarcVal = txt;
            if (txt.includes('p=reject')) {
              dmarcStatus = isDNSSEC ? '✅ Sécurisé (Reject)' : '✅ Sécurisé (Reject) [Non-DNSSEC]';
            } else if (txt.includes('p=quarantine')) {
              dmarcStatus = isDNSSEC ? '✅ Modéré (Quarantine)' : '✅ Modéré (Quarantine) [Non-DNSSEC]';
            } else if (txt.includes('p=none')) {
              dmarcStatus = '⚠️ Faible (Observation)';
              isSecure = false;
            }
            break;
          }
        }
      }
    } catch (e) {
      logError('auditDNS-DMARC', e);
    }

    if (dmarcVal === 'Non trouvé') {
      isSecure = false;
      metrics.missingDmarc++;
    }

    allRows.push([domain, 'DMARC', dmarcVal, dmarcStatus]);

    if (isSecure) {
      metrics.secureDomains++;
    }
  }

  const colDefs = [
    { type: 'bold' },     // domain
    {},                   // record type
    {},                   // value
    { type: 'center' }    // status
  ];

  writeDataRows(sheet, allRows, colDefs);
  addAutoFilter(sheet, headers.length);
  _saveMetrics('dns', metrics);

  showToast(`${tr.done} — ${domains.length} domaines analysés`, tr.menu_dns);
  return metrics;
}
