/**
 * CSV Processor
 * 
 * Bearbetar Facebook API CSV-filer med Papa Parse
 * Hanterar validering och transformering av månadsdata
 */
import Papa from 'papaparse';
import { MonthlyPageData, FacebookPage, TimeseriesDataset } from './timeseries_models.js';
import { extractPeriodFromFile } from './period_extractor.js';

/**
 * Förväntade CSV-kolumner för Facebook API månadsdata
 * Exakt ordning och namn som förväntas i CSV-filerna
 */
export const EXPECTED_COLUMNS = [
  'Page',
  'Page ID',
  'Reach',
  'Engaged Users',
  'Engagements',
  'Reactions',
  'Publications',
  'Status',
  'Comment'
];

/**
 * Konfiguration för Papa Parse
 */
const PAPA_PARSE_CONFIG = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false, // Håll som strings för bättre kontroll
  delimiter: ',',
  quoteChar: '"',
  escapeChar: '"'
};

/**
 * Processar en Facebook API CSV-fil
 * @param {File} file - CSV-fil att processera
 * @returns {Promise<Object>} - Resultat med data och metadata
 */
export async function processFacebookCSV(file) {
  if (!file) {
    throw new Error('Ingen fil angiven för processering');
  }

  // Extrahera period från filnamn
  const periodInfo = extractPeriodFromFile(file, true);
  if (!periodInfo) {
    throw new Error(`Kunde inte extrahera period från filnamn: ${file.name}`);
  }

  // Läs filinnehåll
  const csvContent = await readFileContent(file);
  
  // Parsa CSV med Papa Parse
  const parseResult = await parseCSVContent(csvContent, file.name);
  
  // Validera kolumner
  validateCSVStructure(parseResult, file.name);
  
  // Konvertera till våra datastrukturer
  const monthlyDataList = convertToMonthlyData(parseResult.data, periodInfo.year, periodInfo.month);
  
  return {
    period: periodInfo,
    data: monthlyDataList,
    metadata: {
      filename: file.name,
      fileSize: file.size,
      rowCount: monthlyDataList.length,
      processedAt: new Date(),
      columns: parseResult.meta.fields,
      errors: parseResult.errors,
      hasErrors: parseResult.errors.length > 0
    }
  };
}

/**
 * Processar flera Facebook API CSV-filer
 * @param {FileList|Array<File>} files - Lista med CSV-filer
 * @returns {Promise<Object>} - Resultat med kombinerad data och metadata
 */
export async function processMultipleFacebookCSVs(files) {
  if (!files || files.length === 0) {
    throw new Error('Inga filer angivna för processering');
  }

  const results = [];
  const errors = [];
  const dataset = new TimeseriesDataset();

  const filesArray = Array.from(files);
  
  for (const file of filesArray) {
    try {
      console.log(`Processar fil: ${file.name}`);
      const result = await processFacebookCSV(file);
      
      // Lägg till data i dataset
      for (const monthlyData of result.data) {
        dataset.addMonthlyData(monthlyData);
      }
      
      results.push(result);
    } catch (error) {
      console.error(`Fel vid processering av ${file.name}:`, error);
      errors.push({
        filename: file.name,
        error: error.message
      });
    }
  }

  return {
    dataset,
    results,
    errors,
    summary: {
      totalFiles: filesArray.length,
      successfulFiles: results.length,
      failedFiles: errors.length,
      totalPages: dataset.getAllPages().length,
      totalPeriods: dataset.getAllPeriods().length,
      processedAt: new Date()
    }
  };
}

/**
 * Läser filinnehåll som text
 * @param {File} file - Fil att läsa
 * @returns {Promise<string>} - Filinnehåll som string
 */
async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error(`Kunde inte läsa fil: ${file.name}`));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parsar CSV-innehåll med Papa Parse
 * @param {string} csvContent - CSV-innehåll som string
 * @param {string} filename - Filnamn för felmeddelanden
 * @returns {Promise<Object>} - Papa Parse resultat
 */
async function parseCSVContent(csvContent, filename) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      ...PAPA_PARSE_CONFIG,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn(`Papa Parse varningar för ${filename}:`, results.errors);
        }
        resolve(results);
      },
      error: (error) => {
        reject(new Error(`Papa Parse fel för ${filename}: ${error.message}`));
      }
    });
  });
}

/**
 * Validerar CSV-struktur mot förväntade kolumner
 * @param {Object} parseResult - Papa Parse resultat
 * @param {string} filename - Filnamn för felmeddelanden
 */
function validateCSVStructure(parseResult, filename) {
  if (!parseResult.meta || !parseResult.meta.fields) {
    throw new Error(`CSV-fil ${filename} har ingen header eller är korrupt`);
  }

  const actualColumns = parseResult.meta.fields;
  const normalizedActual = actualColumns.map(col => col.trim());
  const normalizedExpected = EXPECTED_COLUMNS.map(col => col.trim());

  // Kontrollera antal kolumner
  if (normalizedActual.length !== normalizedExpected.length) {
    throw new Error(
      `CSV-fil ${filename} har ${normalizedActual.length} kolumner, förväntat ${normalizedExpected.length}. ` +
      `Hittade: [${normalizedActual.join(', ')}]`
    );
  }

  // Kontrollera kolumnnamn
  const missingColumns = [];
  const extraColumns = [];

  for (let i = 0; i < normalizedExpected.length; i++) {
    if (normalizedActual[i] !== normalizedExpected[i]) {
      missingColumns.push(normalizedExpected[i]);
      extraColumns.push(normalizedActual[i]);
    }
  }

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV-fil ${filename} har felaktiga kolumnnamn. ` +
      `Förväntat: [${normalizedExpected.join(', ')}]. ` +
      `Hittade: [${normalizedActual.join(', ')}]`
    );
  }

  // Kontrollera att det finns data
  if (!parseResult.data || parseResult.data.length === 0) {
    throw new Error(`CSV-fil ${filename} innehåller ingen data`);
  }

  console.log(`CSV-struktur validerad för ${filename}: ${parseResult.data.length} rader`);
}

/**
 * Konverterar parsad CSV-data till MonthlyPageData objekt
 * @param {Array<Object>} csvRows - Parsade CSV-rader
 * @param {number} year - År för denna data
 * @param {number} month - Månad för denna data
 * @returns {Array<MonthlyPageData>} - Lista med MonthlyPageData objekt
 */
function convertToMonthlyData(csvRows, year, month) {
  const monthlyDataList = [];
  const errors = [];

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    
    try {
      // Hoppa över tomma rader
      if (!row.Page && !row['Page ID']) {
        continue;
      }

      // Skapa MonthlyPageData från CSV-rad
      const monthlyData = MonthlyPageData.fromCSVRow(row, year, month);
      monthlyDataList.push(monthlyData);
      
    } catch (error) {
      console.warn(`Fel vid konvertering av rad ${i + 1}:`, error.message, row);
      errors.push({
        row: i + 1,
        data: row,
        error: error.message
      });
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} rader kunde inte konverteras:`, errors);
  }

  if (monthlyDataList.length === 0) {
    throw new Error('Ingen giltig data kunde extraheras från CSV-filen');
  }

  console.log(`Konverterade ${monthlyDataList.length} rader till MonthlyPageData objekt`);
  return monthlyDataList;
}

/**
 * Validerar en enskild CSV-rad mot förväntad struktur
 * @param {Object} row - CSV-rad att validera
 * @returns {Object} - Valideringsresultat {isValid, errors}
 */
export function validateCSVRow(row) {
  const result = {
    isValid: true,
    errors: []
  };

  // Kontrollera obligatoriska fält
  if (!row.Page || row.Page.trim() === '') {
    result.errors.push('Saknar Page (sidnamn)');
    result.isValid = false;
  }

  if (!row['Page ID'] || row['Page ID'].toString().trim() === '') {
    result.errors.push('Saknar Page ID');
    result.isValid = false;
  }

  // Kontrollera numeriska fält (varning, inte fel)
  const numericFields = ['Reach', 'Engaged Users', 'Engagements', 'Reactions', 'Publications', 'Status', 'Comment'];
  
  for (const field of numericFields) {
    const value = row[field];
    if (value !== undefined && value !== '' && value !== null) {
      const numValue = parseFloat(String(value).replace(/,/g, ''));
      if (isNaN(numValue) || numValue < 0) {
        result.errors.push(`${field} har ogiltigt värde: ${value}`);
      }
    }
  }

  return result;
}

/**
 * Skapar exempel-CSV data för testning
 * @param {number} year - År
 * @param {number} month - Månad
 * @param {number} pageCount - Antal sidor att skapa (default 5)
 * @returns {string} - CSV-innehåll som string
 */
export function createSampleCSVData(year, month, pageCount = 5) {
  const headers = EXPECTED_COLUMNS;
  const rows = [headers.join(',')];

  for (let i = 1; i <= pageCount; i++) {
    const row = [
      `Test Page ${i}`,                    // Page
      `page_id_${i}`,                      // Page ID
      Math.floor(Math.random() * 10000),  // Reach
      Math.floor(Math.random() * 1000),   // Engaged Users
      Math.floor(Math.random() * 2000),   // Engagements
      Math.floor(Math.random() * 1500),   // Reactions
      Math.floor(Math.random() * 50),     // Publications
      Math.floor(Math.random() * 30),     // Status
      Math.floor(Math.random() * 200)     // Comment
    ];
    
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Exporterar data som CSV-string
 * @param {Array<MonthlyPageData>} monthlyDataList - Data att exportera
 * @returns {string} - CSV-innehåll som string
 */
export function exportToCSV(monthlyDataList) {
  if (!monthlyDataList || monthlyDataList.length === 0) {
    throw new Error('Ingen data att exportera');
  }

  const headers = EXPECTED_COLUMNS;
  const rows = [headers.join(',')];

  for (const monthlyData of monthlyDataList) {
    const row = [
      `"${monthlyData.page.pageName}"`,
      monthlyData.page.pageId,
      monthlyData.metrics.reach,
      monthlyData.metrics.engagedUsers,
      monthlyData.metrics.engagements,
      monthlyData.metrics.reactions,
      monthlyData.metrics.publications,
      monthlyData.metrics.status,
      monthlyData.metrics.comment
    ];
    
    rows.push(row.join(','));
  }

  return rows.join('\n');
}