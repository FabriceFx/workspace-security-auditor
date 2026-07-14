# Workspace Security Auditor

A comprehensive, serverless security audit tool for Google Workspace. Built natively in Google Apps Script, it extracts and analyzes security metrics directly into a Google Sheets dashboard.

## 🌟 Features

This tool performs a read-only audit across multiple Google Workspace vectors:

- **🔐 Identity & Access (IAM)**: Detects Super Admins, inactive accounts (>90 days), suspended accounts, and missing 2-Step Verification (2FA). Identifies high-risk recovery emails outside the corporate domain.
- **📁 Drive & Sharing**: Scans for public files ("Anyone with the link") and massive external sharing.
- **✉️ Email Security (DNS)**: Verifies the presence of SPF (`-all`) and DMARC (`p=reject`) directly via DNS-over-HTTPS.
- **🤖 OAuth & Integrations**: Inventories third-party apps connected to user accounts, categorizing them by risk severity (Critical, High, Medium) based on granted scopes. Detects legacy App Passwords bypassing 2FA.
- **📱 Mobile Devices (MDM)**: Lists managed devices and highlights non-compliant or unencrypted BYOD endpoints.
- **👥 Groups**: Identifies external members in internal groups and orphaned groups without owners.
- **📋 Admin Logs**: Highlights critical administrative actions (e.g., suspicious mail forwarding, recovery email changes) to detect account takeover attempts.

## 🛠 Prerequisites

Since this tool runs in Google Apps Script, you do not need to host any server. However, you need the right permissions:

1. A **Super Admin** account on the Google Workspace tenant.
2. The following **Advanced Services** must be enabled in your Apps Script project:
   - `AdminDirectory` (Directory API)
   - `AdminReports` (Reports API)
   - `Drive` (Drive API v3)
   - `AdminGroupsSettings` (Groups Settings API)

## 🚀 Installation

1. Create a new Google Sheet.
2. Open **Extensions > Apps Script**.
3. Copy the files from this repository into your Apps Script project (using [clasp](https://github.com/google/clasp) is recommended).
4. Enable the necessary Advanced Services (see above).
5. Reload your Google Sheet. You will see a new **Workspace Audit** menu.

## 📊 Usage

1. Click on **Workspace Audit > Configuration** to set up your domain(s).
   - *Pro tip: Use `*` to automatically discover and audit all domains in your tenant.*
2. Click on **Workspace Audit > 🔄 Refresh Dashboard** (or run individual modules via the Sidebar).
3. Review the visual dashboard and the dedicated sheets for deep-dive analysis.

## ⚠️ Important Note on Permissions

This tool is strictly designed to perform **Read-Only** queries and does not modify any settings, users, or files. The audit data never leaves your Google Sheet.

*Disclaimer regarding Google APIs:* While we use `.readonly` scopes whenever possible, Google does not currently provide read-only scopes for the Groups Settings API (`apps.groups.settings`) and the User Security API (`admin.directory.user.security`). These scopes technically allow write access, even though the script's code never uses it. We recommend locking down edit access to your Apps Script project to prevent malicious modifications.

## 📝 License

MIT License

---

# Workspace Security Auditor (Français)

Un outil d'audit de sécurité complet et "serverless" pour Google Workspace. Développé nativement en Google Apps Script, il extrait et analyse les métriques de sécurité directement dans un tableau de bord Google Sheets.

## 🌟 Fonctionnalités

Cet outil effectue un audit en lecture seule sur plusieurs vecteurs de Google Workspace :

- **🔐 Identité & Accès (IAM)** : Détecte les Super Admins, les comptes inactifs (>90 jours), les comptes suspendus, et l'absence de validation en deux étapes (2FA). Identifie les emails de récupération à haut risque en dehors du domaine de l'entreprise.
- **📁 Drive & Partages** : Scan des fichiers publics ("Tous les utilisateurs disposant du lien") et des partages externes massifs.
- **✉️ Sécurité Email (DNS)** : Vérifie la présence des politiques SPF (`-all`) et DMARC (`p=reject`) directement via DNS-over-HTTPS.
- **🤖 OAuth & Intégrations** : Dresse l'inventaire des applications tierces connectées aux comptes utilisateurs, en les classant par niveau de risque (Critique, Élevé, Moyen) selon les permissions accordées. Détecte les mots de passe d'application obsolètes qui contournent la 2FA.
- **📱 Appareils Mobiles (MDM)** : Liste les appareils gérés et met en évidence les terminaux non conformes ou non chiffrés.
- **👥 Groupes** : Identifie les membres externes dans les groupes internes et les groupes sans propriétaire.
- **📋 Journaux Admin** : Met en évidence les actions administratives critiques (ex: transferts de mails suspects, modification des emails de secours) pour détecter les tentatives de compromission de compte.
## 🛠 Prérequis

Cet outil s'exécutant dans Google Apps Script, vous n'avez pas besoin d'héberger de serveur. Cependant, vous avez besoin des permissions appropriées :

1. Un compte **Super Admin** sur le tenant Google Workspace.
2. Les **Services Avancés** suivants doivent être activés dans votre projet Apps Script :
   - `AdminDirectory` (Directory API)
   - `AdminReports` (Reports API)
   - `Drive` (Drive API v3)
   - `AdminGroupsSettings` (Groups Settings API)

## 🚀 Installation

1. Créez un nouveau fichier Google Sheets.
2. Ouvrez **Extensions > Apps Script**.
3. Copiez les fichiers de ce dépôt dans votre projet Apps Script (l'utilisation de [clasp](https://github.com/google/clasp) est recommandée).
4. Activez les Services Avancés nécessaires (voir ci-dessus).
5. Rechargez votre Google Sheets. Vous verrez apparaître un nouveau menu **Workspace Audit**.

## 📊 Utilisation

1. Cliquez sur **Workspace Audit > Configuration** pour configurer votre (vos) domaine(s).
   - *Astuce : Utilisez `*` pour découvrir et auditer automatiquement tous les domaines de votre console.*
2. Cliquez sur **Workspace Audit > 🔄 Refresh Dashboard** (ou lancez les modules individuellement via le panneau latéral).
3. Consultez le tableau de bord visuel et les feuilles dédiées pour une analyse approfondie.

## ⚠️ Remarque Importante sur les Permissions

Cet outil est conçu pour effectuer strictement des requêtes en **Lecture Seule**. Il ne modifie aucun paramètre, utilisateur ou fichier. Les données d'audit ne quittent jamais votre fichier Google Sheets.

*Avertissement concernant les API Google :* Bien que nous utilisions les portées (scopes) `.readonly` dès que possible, Google ne fournit actuellement pas de version en lecture seule pour l'API Groups Settings (`apps.groups.settings`) et l'API User Security (`admin.directory.user.security`). Ces portées autorisent techniquement l'écriture, bien que le code de ce script ne l'utilise jamais. Nous recommandons de restreindre strictement les droits d'édition sur votre projet Apps Script pour éviter toute modification malveillante.

## 📝 Licence

Licence MIT
