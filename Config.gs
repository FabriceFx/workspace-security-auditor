/**
 * ============================================================
 * Config.gs — Configuration centrale de l'outil d'audit
 * Google Workspace Audit Tool
 * ============================================================
 */

// ─── Langue par défaut ────────────────────────────────────────
// 'fr' ou 'en'
const DEFAULT_LANG = 'fr';

// ─── Clés de stockage dans PropertiesService ──────────────────
const PROP_DOMAINS    = 'AUDIT_DOMAINS';       // JSON array de domaines
const PROP_LANG       = 'AUDIT_LANG';          // 'fr' ou 'en'
const PROP_EMAIL      = 'AUDIT_EMAIL';         // email(s) pour rapports (JSON array)
const PROP_SCHED_DAY  = 'AUDIT_SCHED_DAY';    // 0=dim..6=sam
const PROP_SCHED_HOUR = 'AUDIT_SCHED_HOUR';   // 0-23
const PROP_TRIGGER_ID = 'AUDIT_TRIGGER_ID';   // ID du trigger hebdo

// ─── Valeurs par défaut ───────────────────────────────────────
const DEFAULT_INACTIVE_DAYS = 90;   // Jours d'inactivité pour alerte
const DEFAULT_SCHED_DAY     = 1;    // Lundi
const DEFAULT_SCHED_HOUR    = 7;    // 7h du matin

// ─── Noms des feuilles ────────────────────────────────────────
const SHEETS = {
  DASHBOARD : '📊 Dashboard',
  USERS     : '👤 Utilisateurs',
  GROUPS    : '👥 Groupes',
  DRIVE     : '📁 Drive',
  SECURITY  : '🔐 Sécurité',
  LOGS      : '📋 Logs Admin',
  ALERTS    : '🚨 Alertes',
  LOGIN     : '🔑 Connexions',
  DEVICES   : '📱 Appareils',
  DNS       : '🌐 DNS',
};

// ─── Couleurs de la charte graphique ─────────────────────────
const COLORS = {
  HEADER_BG    : '#1a1a2e',   // Fond entêtes sombres
  HEADER_FG    : '#e0e0e0',   // Texte entêtes
  ACCENT_BLUE  : '#0f3460',   // Bleu foncé
  ACCENT_TEAL  : '#16213e',
  OK           : '#27ae60',   // Vert = OK
  WARNING      : '#f39c12',   // Orange = Avertissement
  DANGER       : '#e74c3c',   // Rouge = Danger
  INFO         : '#2980b9',   // Bleu = Info
  ROW_ALT      : '#f8f9fa',   // Lignes alternées
  ROW_WHITE    : '#ffffff',
  BORDER       : '#dee2e6',
};

// ─── Dictionnaire bilangue ────────────────────────────────────
const I18N = {
  fr: {
    // Menus
    menu_title           : 'Workspace Audit',
    menu_refresh_dash    : '🔄 Actualiser le tableau de bord',
    menu_audit           : 'Auditer...',
    menu_users           : '👤 Utilisateurs',
    menu_groups          : '👥 Groupes',
    menu_drive           : '📁 Drive & Partages',
    menu_security        : '🔐 Sécurité & OAuth',
    menu_logs            : '📋 Journaux Admin',
    menu_alerts          : '🚨 Centre d\'Alertes',
    menu_dns             : '🌐 DNS (SPF/DMARC)',
    menu_login           : '🔑 Connexions',
    menu_devices         : '📱 Appareils',
    menu_config          : '⚙️ Configuration',
    menu_scheduler       : '📧 Planifier rapport email',
    menu_stop_scheduler  : '⏹ Arrêter les rapports planifiés',
    menu_open_panel      : '🖥 Ouvrir le panneau de contrôle',
    menu_about           : 'ℹ️ À propos',

    // Messages généraux
    loading              : 'Chargement en cours...',
    done                 : 'Terminé !',
    error                : 'Erreur',
    no_data              : 'Aucune donnée trouvée',
    confirm_run          : 'Lancer l\'audit complet du domaine',
    audit_running        : 'Audit en cours...',
    audit_done           : 'Audit terminé avec succès.',

    // En-têtes — Utilisateurs
    col_email            : 'Email',
    col_name             : 'Nom complet',
    col_status           : 'Statut',
    col_created          : 'Créé le',
    col_last_login       : 'Dernière connexion',
    col_2fa              : '2FA activé',
    col_is_admin         : 'Administrateur',
    col_is_super_admin   : 'Super Admin',
    col_suspended        : 'Suspendu',
    col_org_unit         : 'Unité org.',
    col_inactive         : 'Inactif (>90j)',
    col_recovery_email   : 'Email Récup.',
    col_recovery_phone   : 'Tél Récup.',
    col_domain           : 'Domaine',

    // En-têtes — Groupes
    col_group_name       : 'Nom du groupe',
    col_group_email      : 'Email du groupe',
    col_member_count     : 'Nb membres',
    col_member_email     : 'Membre',
    col_member_role      : 'Rôle',
    col_member_type      : 'Type',
    col_allow_ext        : 'Envoi externe autorisé',
    col_visibility       : 'Visibilité',

    // En-têtes — Drive
    col_file_name        : 'Nom du fichier',
    col_file_location    : 'Emplacement',
    col_file_owner       : 'Propriétaire',
    col_file_type        : 'Type',
    col_shared_with      : 'Partagé avec',
    col_sharing_type     : 'Type de partage',
    col_last_modified    : 'Dernière modification',
    col_file_url         : 'URL',

    // En-têtes — Sécurité
    col_token_user       : 'Utilisateur',
    col_token_app        : 'Application',
    col_token_scope      : 'Permissions (Scopes)',
    col_token_issued     : 'Délivré le',
    col_app_passwords    : 'Mots de passe d\'app.',
    col_severity         : 'Sévérité',
    col_no_2fa           : 'Sans 2FA',

    // En-têtes — Logs
    col_log_time         : 'Horodatage',
    col_log_actor        : 'Acteur',
    col_log_event        : 'Événement',
    col_log_target       : 'Cible',
    col_log_ip           : 'Adresse IP',

    // En-têtes — Alertes
    col_alert_time       : 'Date/Heure',
    col_alert_type       : 'Type d\'alerte',
    col_alert_severity   : 'Sévérité',
    col_alert_status     : 'Statut',
    col_alert_source     : 'Source',
    col_alert_desc       : 'Description technique',

    // En-têtes — Connexions
    col_login_time       : 'Date/Heure',
    col_login_user       : 'Utilisateur',
    col_login_ip         : 'IP',
    col_login_type       : 'Type',
    col_login_result     : 'Résultat',
    col_login_country    : 'Pays',

    // En-têtes — Appareils
    col_device_name      : 'Appareil',
    col_device_user      : 'Utilisateur',
    col_device_os        : 'Système',
    col_dev_model        : 'Modèle',
    
    // En-têtes — DNS
    col_dns_record       : 'Enregistrement',
    col_dns_value        : 'Valeur',
    col_dns_status       : 'Statut de sécurité',

    // Valeurs communes
    col_device_status    : 'Statut MDM',
    col_device_encrypted : 'Chiffré',
    col_device_sync      : 'Dernière synchro',
    col_device_serial    : 'N° série',

    // Dashboard
    dash_title           : 'Tableau de bord — Workspace Audit',
    dash_domain          : 'Domaine(s) audité(s)',
    dash_last_audit      : 'Dernier audit',
    dash_total_users     : 'Utilisateurs totaux',
    dash_inactive_users  : 'Utilisateurs inactifs',
    dash_no_2fa          : 'Sans 2FA',
    dash_shared_ext      : 'Fichiers partagés ext.',
    dash_oauth_apps      : 'Apps OAuth tierces',
    dash_failed_logins   : 'Connexions échouées (7j)',
    dash_devices         : 'Appareils inscrits',
    dash_risk_score      : 'Score de risque',

    // Statuts
    status_active        : 'Actif',
    status_suspended     : 'Suspendu',
    status_yes           : 'Oui',
    status_no            : 'Non',
    status_public        : 'Public',
    status_private       : 'Privé',
    status_ok            : '✅ OK',
    status_warn          : '⚠️ Attention',
    status_danger        : '🚨 Danger',
    status_anyone        : 'Public (quiconque)',
    status_domain        : 'Domaine interne',
    status_specific      : 'Utilisateurs spécifiques',
    status_external      : 'Externe',

    // Email rapport
    email_subject        : '[Workspace Audit] Rapport de sécurité hebdomadaire',
    email_greeting       : 'Bonjour,',
    email_intro          : 'Voici le résumé de l\'audit de sécurité de votre domaine Google Workspace.',
    email_footer         : 'Rapport généré automatiquement par Workspace Audit.',

    // Config dialog
    cfg_title            : 'Configuration',
    cfg_domains          : 'Domaines à auditer (séparés par des virgules, ou * pour toute la console)',
    cfg_lang             : 'Langue de l\'interface',
    cfg_emails           : 'Emails pour les rapports (séparés par des virgules)',
    cfg_sched_day        : 'Jour d\'envoi du rapport hebdomadaire',
    cfg_sched_hour       : 'Heure d\'envoi (format 24h)',
    cfg_save             : 'Enregistrer',
    cfg_saved            : 'Configuration enregistrée.',
    days                 : ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  },

  en: {
    // Menus
    menu_title           : 'Workspace Audit',
    menu_refresh_dash    : '🔄 Refresh Dashboard',
    menu_audit           : 'Audit...',
    menu_users           : '👤 Users',
    menu_groups          : '👥 Groups',
    menu_drive           : '📁 Drive & Sharing',
    menu_security        : '🔐 Security & OAuth',
    menu_logs            : '📋 Admin Logs',
    menu_alerts          : '🚨 Alert Center',
    menu_dns             : '🌐 DNS (SPF/DMARC)',
    menu_login           : '🔑 Login Activity',
    menu_devices         : '📱 Mobile Devices',
    menu_config          : '⚙️ Configuration',
    menu_scheduler       : '📧 Schedule Email Report',
    menu_stop_scheduler  : '⏹ Stop Scheduled Reports',
    menu_open_panel      : '🖥 Open Control Panel',
    menu_about           : 'ℹ️ About',

    // Messages généraux
    loading              : 'Loading...',
    done                 : 'Done!',
    error                : 'Error',
    no_data              : 'No data found',
    confirm_run          : 'Run full domain audit',
    audit_running        : 'Audit running...',
    audit_done           : 'Audit completed successfully.',

    // En-têtes — Utilisateurs
    col_email            : 'Email',
    col_name             : 'Full Name',
    col_status           : 'Status',
    col_created          : 'Created On',
    col_last_login       : 'Last Login',
    col_2fa              : '2FA Enabled',
    col_is_admin         : 'Administrator',
    col_is_super_admin   : 'Super Admin',
    col_suspended        : 'Suspended',
    col_org_unit         : 'Org Unit',
    col_inactive         : 'Inactive (>90d)',
    col_recovery_email   : 'Recovery Email',
    col_recovery_phone   : 'Recovery Phone',
    col_domain           : 'Domain',

    // En-têtes — Groupes
    col_group_name       : 'Group Name',
    col_group_email      : 'Group Email',
    col_member_count     : 'Member Count',
    col_member_email     : 'Member',
    col_member_role      : 'Role',
    col_member_type      : 'Type',
    col_allow_ext        : 'External Sending Allowed',
    col_visibility       : 'Visibility',

    // En-têtes — Drive
    col_file_name        : 'File Name',
    col_file_location    : 'Location',
    col_file_owner       : 'Owner',
    col_file_type        : 'Type',
    col_shared_with      : 'Shared With',
    col_sharing_type     : 'Sharing Type',
    col_last_modified    : 'Last Modified',
    col_file_url         : 'URL',

    // En-têtes — Sécurité
    col_token_user       : 'User',
    col_token_app        : 'Application',
    col_token_scope      : 'Scopes (Permissions)',
    col_token_issued     : 'Issued On',
    col_app_passwords    : 'App Passwords',
    col_severity         : 'Severity',
    col_no_2fa           : 'Without 2FA',

    // En-têtes — Logs
    col_log_time         : 'Timestamp',
    col_log_actor        : 'Actor',
    col_log_event        : 'Event',
    col_log_target       : 'Target',
    col_log_ip           : 'IP Address',

    // En-têtes — Alertes
    col_alert_time       : 'Date/Time',
    col_alert_type       : 'Alert Type',
    col_alert_severity   : 'Severity',
    col_alert_status     : 'Status',
    col_alert_source     : 'Source',
    col_alert_desc       : 'Technical Description',

    // En-têtes — Connexions
    col_login_time       : 'Date/Time',
    col_login_user       : 'User',
    col_login_ip         : 'IP',
    col_login_type       : 'Type',
    col_login_result     : 'Result',
    col_login_country    : 'Country',

    // En-têtes — Appareils
    col_device_name      : 'Device',
    col_device_user      : 'User',
    col_device_os        : 'OS',
    col_dev_model        : 'Model',

    // En-têtes — DNS
    col_dns_record       : 'Record',
    col_dns_value        : 'Value',
    col_dns_status       : 'Security Status',

    // Valeurs communes
    col_device_status    : 'MDM Status',
    col_device_encrypted : 'Encrypted',
    col_device_sync      : 'Last Sync',
    col_device_serial    : 'Serial Number',

    // Dashboard
    dash_title           : 'Dashboard — Workspace Audit',
    dash_domain          : 'Audited Domain(s)',
    dash_last_audit      : 'Last Audit',
    dash_total_users     : 'Total Users',
    dash_inactive_users  : 'Inactive Users',
    dash_no_2fa          : 'Without 2FA',
    dash_shared_ext      : 'Externally Shared Files',
    dash_oauth_apps      : 'Third-party OAuth Apps',
    dash_failed_logins   : 'Failed Logins (7d)',
    dash_devices         : 'Enrolled Devices',
    dash_risk_score      : 'Risk Score',

    // Statuts
    status_active        : 'Active',
    status_suspended     : 'Suspended',
    status_yes           : 'Yes',
    status_no            : 'No',
    status_public        : 'Public',
    status_private       : 'Private',
    status_ok            : '✅ OK',
    status_warn          : '⚠️ Warning',
    status_danger        : '🚨 Danger',
    status_anyone        : 'Public (anyone)',
    status_domain        : 'Domain Internal',
    status_specific      : 'Specific Users',
    status_external      : 'External',

    // Email rapport
    email_subject        : '[Workspace Audit] Weekly Security Report',
    email_greeting       : 'Hello,',
    email_intro          : 'Here is the security audit summary for your Google Workspace domain.',
    email_footer         : 'Report automatically generated by Workspace Audit.',

    // Config dialog
    cfg_title            : 'Configuration',
    cfg_domains          : 'Domains to audit (comma-separated, or * for entire console)',
    cfg_lang             : 'Interface language',
    cfg_emails           : 'Report emails (comma-separated)',
    cfg_sched_day        : 'Weekly report day',
    cfg_sched_hour       : 'Send time (24h format)',
    cfg_save             : 'Save',
    cfg_saved            : 'Configuration saved.',
    days                 : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  }
};

/**
 * Retourne la langue courante (stockée dans PropertiesService ou par défaut).
 */
function getLang() {
  const stored = PropertiesService.getScriptProperties().getProperty(PROP_LANG);
  return (stored === 'fr' || stored === 'en') ? stored : DEFAULT_LANG;
}

/**
 * Retourne le dictionnaire i18n pour la langue courante.
 */
function t() {
  return I18N[getLang()];
}

/**
 * Retourne la liste des domaines configurés.
 * @returns {string[]}
 */
function getDomains() {
  const raw = PropertiesService.getScriptProperties().getProperty(PROP_DOMAINS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

/**
 * Sauvegarde la liste des domaines.
 * @param {string[]} domainsArray
 */
function saveDomains(domainsArray) {
  PropertiesService.getScriptProperties().setProperty(PROP_DOMAINS, JSON.stringify(domainsArray));
}

/**
 * Retourne les emails pour les rapports.
 * @returns {string[]}
 */
function getReportEmails() {
  const raw = PropertiesService.getScriptProperties().getProperty(PROP_EMAIL);
  if (!raw) return [Session.getEffectiveUser().getEmail()];
  try { return JSON.parse(raw); } catch(e) { return [Session.getEffectiveUser().getEmail()]; }
}
