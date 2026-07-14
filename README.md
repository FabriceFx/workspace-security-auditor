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

This tool strictly uses **Read-Only** scopes to query your tenant's data. It does not modify any settings, users, or files. The audit data never leaves your Google Sheet.

## 📝 License

MIT License
