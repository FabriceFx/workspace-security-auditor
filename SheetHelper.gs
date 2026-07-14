/**
 * ============================================================
 * SheetHelper.gs — Écriture et mise en forme des feuilles
 * ============================================================
 */

/**
 * Vide une feuille, ajoute un en-tête formaté et retourne la feuille.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} headers   Tableau des noms de colonnes
 * @param {string}   sheetTitle  Titre à afficher (ligne 1)
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function prepareSheet(sheet, headers, sheetTitle) {
  sheet.clearContents();
  sheet.clearFormats();

  const numCols = Math.max(headers.length, 1);

  // ── Ligne de titre (row 1) ──────────────────────────────────
  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue(sheetTitle)
    .setBackground(COLORS.HEADER_BG)
    .setFontColor(COLORS.HEADER_FG)
    .setFontSize(13)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);

  // ── Sous-ligne : dernière mise à jour (row 2) ───────────────
  const updateLabel = getLang() === 'fr'
    ? `Dernière mise à jour : ${now()}`
    : `Last updated: ${now()}`;
  sheet.getRange(2, 1, 1, numCols).merge()
    .setValue(updateLabel)
    .setBackground(COLORS.ACCENT_BLUE)
    .setFontColor('#a0c4e8')
    .setFontSize(10)
    .setFontStyle('italic')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(2, 22);

  // ── Ligne d'en-têtes (row 3) ────────────────────────────────
  const headerRange = sheet.getRange(3, 1, 1, numCols);
  headerRange.setValues([headers])
    .setBackground('#16213e')
    .setFontColor('#e2e8f0')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false,
      COLORS.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(3, 28);

  // Freeze les 3 premières lignes
  sheet.setFrozenRows(3);

  return sheet;
}

/**
 * Écrit des lignes de données dans la feuille à partir de la ligne 4.
 * Applique un formatage alterné et des règles de couleur conditionnelle.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array[]}  rows    Tableau 2D de valeurs
 * @param {Object[]} colDefs Définitions de colonnes avec options de formatage
 *   colDef: { type: 'text'|'date'|'risk'|'url', riskCol: number }
 */
function writeDataRows(sheet, rows, colDefs) {
  if (!rows || rows.length === 0) {
    const tr = t();
    sheet.getRange(4, 1).setValue(tr.no_data)
      .setFontStyle('italic')
      .setFontColor('#999999');
    return;
  }

  const startRow = 4;
  const numCols = rows[0].length;

  // Écriture batch pour performance
  sheet.getRange(startRow, 1, rows.length, numCols).setValues(rows);

  // Formatage alterné ligne par ligne
  for (let i = 0; i < rows.length; i++) {
    const rowNum = startRow + i;
    const bgColor = i % 2 === 0 ? COLORS.ROW_WHITE : COLORS.ROW_ALT;
    const rowRange = sheet.getRange(rowNum, 1, 1, numCols);
    rowRange.setBackground(bgColor)
      .setFontSize(10)
      .setVerticalAlignment('middle')
      .setBorder(false, false, true, false, false, false,
        COLORS.BORDER, SpreadsheetApp.BorderStyle.DOTTED);
    sheet.setRowHeight(rowNum, 22);

    // Application des styles par colonne
    if (colDefs) {
      colDefs.forEach((def, colIdx) => {
        const cell = sheet.getRange(rowNum, colIdx + 1);
        switch (def.type) {
          case 'risk': {
            const cellVal = String(rows[i][colIdx]);
            if (cellVal.includes('🚨') || cellVal === t().status_danger) {
              cell.setBackground('#fdecea').setFontColor(COLORS.DANGER).setFontWeight('bold');
            } else if (cellVal.includes('⚠️') || cellVal === t().status_warn) {
              cell.setBackground('#fef9e7').setFontColor(COLORS.WARNING).setFontWeight('bold');
            } else if (cellVal.includes('✅') || cellVal === t().status_ok) {
              cell.setBackground('#eafaf1').setFontColor(COLORS.OK);
            }
            break;
          }
          case 'bool_danger': {
            // true = danger (rouge), false = OK (vert)
            const val = rows[i][colIdx];
            if (val === t().status_yes) {
              cell.setBackground('#fdecea').setFontColor(COLORS.DANGER).setFontWeight('bold');
            } else {
              cell.setFontColor('#666666');
            }
            break;
          }
          case 'bool_good': {
            // true = bon (vert), false = danger (rouge)
            const val = rows[i][colIdx];
            if (val === t().status_yes) {
              cell.setBackground('#eafaf1').setFontColor(COLORS.OK);
            } else {
              cell.setBackground('#fdecea').setFontColor(COLORS.DANGER).setFontWeight('bold');
            }
            break;
          }
          case 'url': {
            const urlVal = rows[i][colIdx];
            if (urlVal && String(urlVal).startsWith('http')) {
              const label = getLang() === 'fr' ? 'Ouvrir' : 'Open';
              const sep   = getLang() === 'fr' ? ';' : ',';
              cell.setFormula(`=HYPERLINK("${urlVal}"${sep}"${label}")`);
              cell.setFontColor(COLORS.INFO)
                  .setHorizontalAlignment('center');
            }
            break;
          }
          case 'center':
            cell.setHorizontalAlignment('center');
            break;
        }
      });
    }
  }

  // Redimensionne les colonnes automatiquement
  try {
    for (let c = 1; c <= numCols; c++) {
      sheet.autoResizeColumn(c);
      // Largeur max pour éviter les colonnes trop larges
      const width = sheet.getColumnWidth(c);
      if (width > 300) sheet.setColumnWidth(c, 300);
      if (width < 80)  sheet.setColumnWidth(c, 80);
    }
  } catch(e) {}
}

/**
 * Ajoute un filtre automatique sur les en-têtes (ligne 3) et active l'onglet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} numCols
 */
function addAutoFilter(sheet, numCols) {
  try {
    sheet.activate();
    const lastRow = Math.max(sheet.getLastRow(), 4);
    sheet.getRange(3, 1, lastRow - 2, numCols).createFilter();
  } catch(e) {}
}

/**
 * Crée ou met à jour le compteur KPI affiché sur le Dashboard.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dashSheet
 * @param {number} row       Ligne de départ (1-indexed)
 * @param {number} col       Colonne de départ (1-indexed)
 * @param {string} label     Libellé du KPI
 * @param {string|number} value  Valeur à afficher
 * @param {'ok'|'warning'|'danger'|'info'} level  Niveau de criticité
 */
function writeKpiCell(dashSheet, row, col, label, value, level) {
  const bgMap   = { ok: '#eafaf1', warning: '#fef9e7', danger: '#fdecea', info: '#eaf4fb' };
  const fgMap   = { ok: COLORS.OK, warning: COLORS.WARNING, danger: COLORS.DANGER, info: COLORS.INFO };
  const iconMap = { ok: '✅', warning: '⚠️', danger: '🚨', info: 'ℹ️' };

  const bg = bgMap[level] || bgMap.info;
  const fg = fgMap[level] || fgMap.info;
  const icon = iconMap[level] || '';

  // Cellule label (2 lignes de hauteur)
  dashSheet.getRange(row, col, 2, 2).merge()
    .setValue(`${icon} ${label}`)
    .setBackground(bg)
    .setFontColor('#555555')
    .setFontSize(9)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('bottom')
    .setBorder(true, true, false, true, false, false,
      COLORS.BORDER, SpreadsheetApp.BorderStyle.SOLID);

  // Cellule valeur (2 lignes)
  dashSheet.getRange(row + 2, col, 2, 2).merge()
    .setValue(value)
    .setBackground(bg)
    .setFontColor(fg)
    .setFontSize(22)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('top')
    .setBorder(false, true, true, true, false, false,
      COLORS.BORDER, SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Positionne la feuille Dashboard en premier onglet.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function moveDashboardFirst(ss) {
  try {
    const dash = ss.getSheetByName(SHEETS.DASHBOARD);
    if (dash) ss.setActiveSheet(dash);
    if (dash) ss.moveActiveSheet(1);
  } catch(e) {}
}

/**
 * Retourne le Spreadsheet actif.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
