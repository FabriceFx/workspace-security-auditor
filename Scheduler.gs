/**
 * ============================================================
 * Scheduler.gs — Rapports email hebdomadaires planifiés
 * ============================================================
 */

/**
 * Active le rapport hebdomadaire (trigger ScriptApp).
 * Appelé depuis le dialog de planification.
 */
function enableWeeklyReport() {
  // Supprime l'ancien trigger s'il existe
  stopScheduledReports(true);

  const props   = PropertiesService.getScriptProperties();
  const schedDay  = parseInt(props.getProperty(PROP_SCHED_DAY)  || DEFAULT_SCHED_DAY);
  const schedHour = parseInt(props.getProperty(PROP_SCHED_HOUR) || DEFAULT_SCHED_HOUR);

  const weekdays = [
    ScriptApp.WeekDay.SUNDAY,
    ScriptApp.WeekDay.MONDAY,
    ScriptApp.WeekDay.TUESDAY,
    ScriptApp.WeekDay.WEDNESDAY,
    ScriptApp.WeekDay.THURSDAY,
    ScriptApp.WeekDay.FRIDAY,
    ScriptApp.WeekDay.SATURDAY,
  ];

  const trigger = ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(weekdays[schedDay])
    .atHour(schedHour)
    .nearMinute(0)
    .create();

  props.setProperty(PROP_TRIGGER_ID, trigger.getUniqueId());

  const lang = getLang();
  showToast(
    lang === 'fr'
      ? `✅ Rapport hebdomadaire activé (${t().days[schedDay]} à ${schedHour}h)`
      : `✅ Weekly report enabled (${t().days[schedDay]} at ${schedHour}:00)`,
    t().menu_title,
    5
  );
}

/**
 * Désactive le rapport hebdomadaire.
 * @param {boolean} [silent=false]  Si true, n'affiche pas de toast
 */
function stopScheduledReports(silent) {
  const props      = PropertiesService.getScriptProperties();
  const triggerId  = props.getProperty(PROP_TRIGGER_ID);

  if (triggerId) {
    ScriptApp.getProjectTriggers().forEach(trigger => {
      if (trigger.getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    props.deleteProperty(PROP_TRIGGER_ID);
  }

  if (!silent) {
    const lang = getLang();
    showToast(
      lang === 'fr' ? '⏹ Rapports planifiés arrêtés.' : '⏹ Scheduled reports stopped.',
      t().menu_title, 4
    );
  }
}

/**
 * Fonction principale appelée par le trigger hebdomadaire.
 * Lance tous les audits, puis envoie le rapport par email.
 */
function sendWeeklyReport() {
  // Lance tous les audits en silence
  let mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices;
  try { mUsers    = auditUsers();         } catch(e) { mUsers    = {}; logError('weekly-users', e);    }
  try { mGroups   = auditGroups();        } catch(e) { mGroups   = {}; logError('weekly-groups', e);   }
  try { mDrive    = auditDrive();         } catch(e) { mDrive    = {}; logError('weekly-drive', e);    }
  try { mSecurity = auditSecurity();      } catch(e) { mSecurity = {}; logError('weekly-security', e); }
  try { auditLogs();                      } catch(e) { logError('weekly-logs', e);                     }
  try { mLogin    = auditLoginActivity(); } catch(e) { mLogin    = {}; logError('weekly-login', e);    }
  try { mDevices  = auditDevices();       } catch(e) { mDevices  = {}; logError('weekly-devices', e);  }

  _buildDashboard(getSS(), t(), { mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices });

  // Construit et envoie l'email
  const html = _buildEmailHtml({ mUsers, mGroups, mDrive, mSecurity, mLogin, mDevices });
  const tr   = t();
  const emails = getReportEmails();

  emails.forEach(email => {
    try {
      GmailApp.sendEmail(email, tr.email_subject, '', {
        htmlBody: html,
        name: 'Workspace Audit',
      });
    } catch(e) {
      logError('sendWeeklyReport', e);
    }
  });
}

/**
 * Construit le corps HTML du rapport email.
 * @param {Object} metricsBundle
 * @returns {string} HTML
 */
function _buildEmailHtml(metricsBundle) {
  const tr   = t();
  const lang = getLang();
  const domains = getDomains();

  const m = {
    totalUsers    : metricsBundle.mUsers?.totalUsers    || 0,
    inactiveUsers : metricsBundle.mUsers?.inactiveUsers || 0,
    no2faUsers    : metricsBundle.mUsers?.no2faUsers    || 0,
    suspendedUsers: metricsBundle.mUsers?.suspendedUsers || 0,
    adminUsers    : metricsBundle.mUsers?.adminUsers    || 0,
    totalGroups   : metricsBundle.mGroups?.totalGroups  || 0,
    externalShares: metricsBundle.mDrive?.externalShares || 0,
    publicFiles   : metricsBundle.mDrive?.publicFiles   || 0,
    oauthApps     : metricsBundle.mSecurity?.oauthApps  || 0,
    failedLogins  : metricsBundle.mLogin?.failedLogins  || 0,
    totalDevices  : metricsBundle.mDevices?.totalDevices || 0,
    nonCompliant  : metricsBundle.mDevices?.nonCompliant || 0,
  };

  const riskScore = computeRiskScore({
    totalUsers    : m.totalUsers,
    inactiveUsers : m.inactiveUsers,
    no2faUsers    : m.no2faUsers,
    externalShares: m.externalShares,
    oauthApps     : m.oauthApps,
    failedLogins  : m.failedLogins,
  });
  const riskLvl   = riskLevel(riskScore);
  const riskHex   = riskColor(riskLvl);

  const ssUrl = getSS().getUrl();

  const kpiRow = (label, value, color, bg) => `
    <td style="padding:12px 8px;text-align:center;background:${bg};border-radius:8px;min-width:100px;">
      <div style="font-size:24px;font-weight:700;color:${color};">${value}</div>
      <div style="font-size:11px;color:#555;margin-top:4px;">${label}</div>
    </td>
    <td style="width:8px;"></td>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tr.email_subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Google Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

  <!-- Header -->
  <tr>
    <td style="background:#1a1a2e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:700;color:#fff;">🔍 Workspace Audit</div>
      <div style="font-size:13px;color:#a0c4e8;margin-top:4px;">${tr.email_subject}</div>
      <div style="font-size:11px;color:#6a8aaa;margin-top:6px;">${now()} — ${domains.join(' · ')}</div>
    </td>
  </tr>

  <!-- Score de risque -->
  <tr>
    <td style="padding:20px 32px;background:${riskHex}20;border-left:4px solid ${riskHex};">
      <div style="font-size:15px;font-weight:600;color:${riskHex};">
        ${_riskLabel(riskLvl, tr)} — ${lang === 'fr' ? 'Score de risque' : 'Risk Score'}: ${riskScore}/100
      </div>
      <div style="background:#e0e0e0;border-radius:999px;height:8px;margin-top:10px;">
        <div style="background:${riskHex};width:${riskScore}%;height:8px;border-radius:999px;"></div>
      </div>
    </td>
  </tr>

  <!-- Intro -->
  <tr>
    <td style="padding:24px 32px 8px;">
      <p style="margin:0;color:#333;font-size:14px;">${tr.email_greeting}</p>
      <p style="color:#555;font-size:13px;line-height:1.6;">${tr.email_intro}</p>
    </td>
  </tr>

  <!-- Section Utilisateurs -->
  <tr>
    <td style="padding:8px 32px;">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;border-bottom:2px solid #1a1a2e;padding-bottom:4px;">
        👤 ${lang === 'fr' ? 'Utilisateurs' : 'Users'}
      </div>
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        ${kpiRow(tr.dash_total_users, m.totalUsers, '#2980b9', '#eaf4fb')}
        ${kpiRow(tr.dash_inactive_users, m.inactiveUsers, m.inactiveUsers > 0 ? COLORS.WARNING : COLORS.OK, m.inactiveUsers > 0 ? '#fef9e7' : '#eafaf1')}
        ${kpiRow(tr.dash_no_2fa, m.no2faUsers, m.no2faUsers > 0 ? COLORS.DANGER : COLORS.OK, m.no2faUsers > 0 ? '#fdecea' : '#eafaf1')}
        ${kpiRow(lang === 'fr' ? 'Groupes' : 'Groups', m.totalGroups, '#2980b9', '#eaf4fb')}
      </tr></table>
    </td>
  </tr>

  <!-- Section Sécurité -->
  <tr>
    <td style="padding:16px 32px 8px;">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;border-bottom:2px solid #1a1a2e;padding-bottom:4px;">
        🔐 ${lang === 'fr' ? 'Sécurité & Drive' : 'Security & Drive'}
      </div>
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        ${kpiRow(tr.dash_shared_ext, m.externalShares, m.externalShares > 0 ? COLORS.WARNING : COLORS.OK, m.externalShares > 0 ? '#fef9e7' : '#eafaf1')}
        ${kpiRow(lang === 'fr' ? 'Fichiers publics' : 'Public files', m.publicFiles, m.publicFiles > 0 ? COLORS.DANGER : COLORS.OK, m.publicFiles > 0 ? '#fdecea' : '#eafaf1')}
        ${kpiRow(tr.dash_oauth_apps, m.oauthApps, COLORS.INFO, '#eaf4fb')}
        ${kpiRow(tr.dash_failed_logins, m.failedLogins, m.failedLogins > 10 ? COLORS.DANGER : COLORS.OK, m.failedLogins > 10 ? '#fdecea' : '#eafaf1')}
      </tr></table>
    </td>
  </tr>

  <!-- Section Appareils -->
  <tr>
    <td style="padding:16px 32px;">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;border-bottom:2px solid #1a1a2e;padding-bottom:4px;">
        📱 ${lang === 'fr' ? 'Appareils' : 'Devices'}
      </div>
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        ${kpiRow(tr.dash_devices, m.totalDevices, COLORS.INFO, '#eaf4fb')}
        ${kpiRow(lang === 'fr' ? 'Non conformes' : 'Non-compliant', m.nonCompliant, m.nonCompliant > 0 ? COLORS.DANGER : COLORS.OK, m.nonCompliant > 0 ? '#fdecea' : '#eafaf1')}
      </tr></table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:16px 32px 24px;text-align:center;">
      <a href="${ssUrl}" style="background:#1a1a2e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        ${lang === 'fr' ? '📊 Voir le rapport complet' : '📊 View Full Report'}
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #dee2e6;">
      <div style="font-size:11px;color:#999;text-align:center;">${tr.email_footer}</div>
      <div style="font-size:10px;color:#bbb;text-align:center;margin-top:4px;">
        ${lang === 'fr' ? 'Domaines audités' : 'Audited domains'}: ${domains.join(', ')}
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
