/**
 * Timeseries Models
 * 
 * Datastrukturer för Facebook API tidserie-analys
 * Hanterar Facebook-sidor och månadsdata med korrekt typning och validering
 */

/**
 * Facebook-sida datastruktur
 * Representerar en enskild Facebook-sida med all grundläggande information
 */
export class FacebookPage {
  constructor(pageName, pageId) {
    if (!pageName || !pageId) {
      throw new Error('FacebookPage kräver både pageName och pageId');
    }
    
    this.pageName = pageName.trim();
    this.pageId = String(pageId).trim();
    this.createdAt = new Date();
  }

  /**
   * Skapar en Facebook-sida från CSV-rad
   * @param {Object} csvRow - Rad från parsad CSV
   * @returns {FacebookPage} - Ny FacebookPage instans
   */
  static fromCSVRow(csvRow) {
    if (!csvRow.Page || !csvRow['Page ID']) {
      throw new Error('CSV-rad saknar obligatoriska fält: Page eller Page ID');
    }
    
    return new FacebookPage(csvRow.Page, csvRow['Page ID']);
  }

  /**
   * Returnerar unik nyckel för denna sida
   * @returns {string} - Unik identifierare
   */
  getKey() {
    return `page_${this.pageId}`;
  }

  /**
   * Validerar att sidan är giltig
   * @returns {boolean} - True om sidan är giltig
   */
  isValid() {
    return this.pageName.length > 0 && this.pageId.length > 0;
  }
}

/**
 * Månadsdata för en specifik Facebook-sida
 * Innehåller alla metrics för en sida under en månad
 */
export class MonthlyPageData {
  constructor(page, year, month, metrics) {
    if (!(page instanceof FacebookPage)) {
      throw new Error('MonthlyPageData kräver en FacebookPage instans');
    }
    
    if (!year || !month || month < 1 || month > 12) {
      throw new Error('MonthlyPageData kräver giltigt år och månad (1-12)');
    }

    this.page = page;
    this.year = parseInt(year);
    this.month = parseInt(month);
    this.metrics = this.validateMetrics(metrics || {});
    this.createdAt = new Date();
  }

  /**
   * Validerar och standardiserar metrics
   * @param {Object} rawMetrics - Rå metrics från CSV
   * @returns {Object} - Validerade metrics
   */
  validateMetrics(rawMetrics) {
    const metrics = {
      // Icke-summerbara metrics (unika personer per månad)
      reach: this.parseNumeric(rawMetrics.reach || rawMetrics.Reach),
      engagedUsers: this.parseNumeric(rawMetrics.engagedUsers || rawMetrics['Engaged Users']),
      
      // Summerbara metrics (kan adderas över månader)
      engagements: this.parseNumeric(rawMetrics.engagements || rawMetrics.Engagements),
      reactions: this.parseNumeric(rawMetrics.reactions || rawMetrics.Reactions),
      publications: this.parseNumeric(rawMetrics.publications || rawMetrics.Publications),
      status: this.parseNumeric(rawMetrics.status || rawMetrics.Status),
      comment: this.parseNumeric(rawMetrics.comment || rawMetrics.Comment)
    };

    return metrics;
  }

  /**
   * Parsar numeriska värden säkert
   * @param {any} value - Värde att parsa
   * @returns {number} - Parsad numerisk värde eller 0
   */
  parseNumeric(value) {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Skapar MonthlyPageData från CSV-rad
   * @param {Object} csvRow - Rad från parsad CSV
   * @param {number} year - År för denna data
   * @param {number} month - Månad för denna data
   * @returns {MonthlyPageData} - Ny MonthlyPageData instans
   */
  static fromCSVRow(csvRow, year, month) {
    const page = FacebookPage.fromCSVRow(csvRow);
    return new MonthlyPageData(page, year, month, csvRow);
  }

  /**
   * Returnerar unik nyckel för denna månadsdata
   * @returns {string} - Unik identifierare
   */
  getKey() {
    return `${this.page.getKey()}_${this.year}_${this.month}`;
  }

  /**
   * Returnerar period som objekt
   * @returns {Object} - Period objekt {year, month}
   */
  getPeriod() {
    return {
      year: this.year,
      month: this.month
    };
  }

  /**
   * Kontrollerar om detta är samma period som angiven
   * @param {number} year - År att jämföra
   * @param {number} month - Månad att jämföra
   * @returns {boolean} - True om samma period
   */
  isSamePeriod(year, month) {
    return this.year === year && this.month === month;
  }

  /**
   * Returnerar summerbara metrics (kan adderas över månader)
   * @returns {Object} - Summerbara metrics
   */
  getSummerableMetrics() {
    return {
      engagements: this.metrics.engagements,
      reactions: this.metrics.reactions,
      publications: this.metrics.publications,
      status: this.metrics.status,
      comment: this.metrics.comment
    };
  }

  /**
   * Returnerar icke-summerbara metrics (unika personer per månad)
   * @returns {Object} - Icke-summerbara metrics
   */
  getNonSummerableMetrics() {
    return {
      reach: this.metrics.reach,
      engagedUsers: this.metrics.engagedUsers
    };
  }
}

/**
 * Tidserie-container för en Facebook-sida
 * Innehåller all månadsdata för en sida över tid
 */
export class PageTimeseries {
  constructor(page) {
    if (!(page instanceof FacebookPage)) {
      throw new Error('PageTimeseries kräver en FacebookPage instans');
    }
    
    this.page = page;
    this.monthlyData = new Map(); // Map<string, MonthlyPageData>
    this.createdAt = new Date();
  }

  /**
   * Lägger till månadsdata för denna sida
   * @param {MonthlyPageData} monthlyData - Månadsdata att lägga till
   */
  addMonthlyData(monthlyData) {
    if (!(monthlyData instanceof MonthlyPageData)) {
      throw new Error('addMonthlyData kräver MonthlyPageData instans');
    }

    if (monthlyData.page.pageId !== this.page.pageId) {
      throw new Error('MonthlyData måste tillhöra samma sida');
    }

    const key = `${monthlyData.year}_${monthlyData.month}`;
    this.monthlyData.set(key, monthlyData);
  }

  /**
   * Hämtar månadsdata för specifik period
   * @param {number} year - År
   * @param {number} month - Månad
   * @returns {MonthlyPageData|null} - Månadsdata eller null om inte finns
   */
  getMonthlyData(year, month) {
    const key = `${year}_${month}`;
    return this.monthlyData.get(key) || null;
  }

  /**
   * Returnerar alla månader som har data
   * @returns {Array<{year: number, month: number}>} - Lista med perioder
   */
  getAvailablePeriods() {
    return Array.from(this.monthlyData.values())
      .map(data => data.getPeriod())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }

  /**
   * Returnerar alla månadsdata sorterat kronologiskt
   * @returns {Array<MonthlyPageData>} - Sorterad lista med månadsdata
   */
  getAllMonthlyData() {
    return Array.from(this.monthlyData.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }

  /**
   * Kontrollerar om sidan har data för specifik period
   * @param {number} year - År
   * @param {number} month - Månad
   * @returns {boolean} - True om data finns
   */
  hasDataForPeriod(year, month) {
    return this.getMonthlyData(year, month) !== null;
  }

  /**
   * Returnerar antal månader med data
   * @returns {number} - Antal månader
   */
  getMonthCount() {
    return this.monthlyData.size;
  }
}

/**
 * Huvudcontainer för all tidserie-data
 * Hanterar flera Facebook-sidor över tid
 */
export class TimeseriesDataset {
  constructor() {
    this.pageTimeseries = new Map(); // Map<string, PageTimeseries>
    this.createdAt = new Date();
  }

  /**
   * Lägger till månadsdata för en sida
   * @param {MonthlyPageData} monthlyData - Månadsdata att lägga till
   */
  addMonthlyData(monthlyData) {
    if (!(monthlyData instanceof MonthlyPageData)) {
      throw new Error('addMonthlyData kräver MonthlyPageData instans');
    }

    const pageKey = monthlyData.page.getKey();
    
    if (!this.pageTimeseries.has(pageKey)) {
      this.pageTimeseries.set(pageKey, new PageTimeseries(monthlyData.page));
    }

    this.pageTimeseries.get(pageKey).addMonthlyData(monthlyData);
  }

  /**
   * Hämtar tidserie för en specifik sida
   * @param {string} pageId - Sido-ID
   * @returns {PageTimeseries|null} - Sidtidserie eller null
   */
  getPageTimeseries(pageId) {
    const pageKey = `page_${pageId}`;
    return this.pageTimeseries.get(pageKey) || null;
  }

  /**
   * Returnerar alla sidor som har data
   * @returns {Array<FacebookPage>} - Lista med sidor
   */
  getAllPages() {
    return Array.from(this.pageTimeseries.values())
      .map(timeseries => timeseries.page)
      .sort((a, b) => a.pageName.localeCompare(b.pageName));
  }

  /**
   * Returnerar alla unika perioder i datasetet
   * @returns {Array<{year: number, month: number}>} - Lista med perioder
   */
  getAllPeriods() {
    const periodsSet = new Set();
    
    for (const timeseries of this.pageTimeseries.values()) {
      for (const period of timeseries.getAvailablePeriods()) {
        periodsSet.add(`${period.year}_${period.month}`);
      }
    }

    return Array.from(periodsSet)
      .map(key => {
        const [year, month] = key.split('_');
        return { year: parseInt(year), month: parseInt(month) };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }

  /**
   * Returnerar alla sidor för en specifik period
   * @param {number} year - År
   * @param {number} month - Månad
   * @returns {Array<MonthlyPageData>} - Lista med månadsdata
   */
  getDataForPeriod(year, month) {
    const result = [];
    
    for (const timeseries of this.pageTimeseries.values()) {
      const monthlyData = timeseries.getMonthlyData(year, month);
      if (monthlyData) {
        result.push(monthlyData);
      }
    }

    return result.sort((a, b) => a.page.pageName.localeCompare(b.page.pageName));
  }

  /**
   * Returnerar statistik om datasetet
   * @returns {Object} - Dataset-statistik
   */
  getStats() {
    return {
      totalPages: this.pageTimeseries.size,
      totalPeriods: this.getAllPeriods().length,
      totalDataPoints: Array.from(this.pageTimeseries.values())
        .reduce((sum, timeseries) => sum + timeseries.getMonthCount(), 0)
    };
  }

  /**
   * Rensar all data
   */
  clear() {
    this.pageTimeseries.clear();
  }
}