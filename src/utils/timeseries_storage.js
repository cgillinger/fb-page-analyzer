/**
 * Timeseries Storage
 * 
 * Hanterar lagring av Facebook API månadsdata i webbläsaren
 * Använder localStorage för metadata och IndexedDB för stora datamängder
 * Anpassad för tidserie-data istället för post-baserad data
 */

// Lagringskonfiguration
const STORAGE_CONFIG = {
  LOCALSTORAGE_KEYS: {
    METADATA: 'fb_analyzer_metadata',
    PERIODS: 'fb_analyzer_periods',
    PAGES: 'fb_analyzer_pages',
    SETTINGS: 'fb_analyzer_settings'
  },
  INDEXEDDB: {
    NAME: 'FacebookAnalyzerDB',
    VERSION: 1,
    STORES: {
      MONTHLY_DATA: 'monthlyData',
      TIMESERIES: 'timeseries'
    }
  },
  LIMITS: {
    LOCALSTORAGE_MAX: 5 * 1024 * 1024,    // 5MB
    INDEXEDDB_MAX: 50 * 1024 * 1024,      // 50MB
    MAX_PERIODS: 120,                      // Max 10 år data
    MAX_PAGES: 1000                        // Max 1000 Facebook-sidor
  }
};

/**
 * Initialiserar IndexedDB för tidserie-lagring
 */
async function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_CONFIG.INDEXEDDB.NAME, STORAGE_CONFIG.INDEXEDDB.VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB initialization failed:', request.error);
      reject(request.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store för månadsdata
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA)) {
        const monthlyStore = db.createObjectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA, {
          keyPath: 'id'
        });
        
        // Index för snabbare sökningar
        monthlyStore.createIndex('pageId', 'pageId', { unique: false });
        monthlyStore.createIndex('period', ['year', 'month'], { unique: false });
        monthlyStore.createIndex('pagePeriod', ['pageId', 'year', 'month'], { unique: true });
        
        console.log('Created monthlyData store with indexes');
      }
      
      // Store för tidsserier (aggregerad data per sida)
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.INDEXEDDB.STORES.TIMESERIES)) {
        const timeseriesStore = db.createObjectStore(STORAGE_CONFIG.INDEXEDDB.STORES.TIMESERIES, {
          keyPath: 'pageId'
        });
        
        timeseriesStore.createIndex('pageName', 'pageName', { unique: false });
        
        console.log('Created timeseries store');
      }
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Sparar månadsdata för en sida i IndexedDB
 * @param {MonthlyPageData} monthlyData - Månadsdata att spara
 * @returns {Promise<boolean>} - True om lyckad
 */
export async function saveMonthlyData(monthlyData) {
  if (!monthlyData || !monthlyData.page || !monthlyData.year || !monthlyData.month) {
    throw new Error('Ogiltig månadsdata för lagring');
  }
  
  try {
    const db = await initializeIndexedDB();
    
    // Skapa storage-objekt
    const storageObject = {
      id: `${monthlyData.page.pageId}_${monthlyData.year}_${monthlyData.month}`,
      pageId: monthlyData.page.pageId,
      pageName: monthlyData.page.pageName,
      year: monthlyData.year,
      month: monthlyData.month,
      metrics: monthlyData.metrics,
      createdAt: monthlyData.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readwrite');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      
      const request = store.put(storageObject);
      
      request.onsuccess = () => {
        console.log(`Saved monthly data: ${storageObject.id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to save monthly data:', request.error);
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error saving monthly data:', error);
    throw error;
  }
}

/**
 * Sparar flera månadsdata i batch
 * @param {Array<MonthlyPageData>} monthlyDataList - Lista med månadsdata
 * @returns {Promise<Object>} - Resultat med antal sparade och fel
 */
export async function saveMonthlyDataBatch(monthlyDataList) {
  if (!Array.isArray(monthlyDataList) || monthlyDataList.length === 0) {
    throw new Error('Tom eller ogiltig månadsdata-lista');
  }
  
  const results = {
    saved: 0,
    failed: 0,
    errors: []
  };
  
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readwrite');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      
      let completed = 0;
      
      for (const monthlyData of monthlyDataList) {
        try {
          const storageObject = {
            id: `${monthlyData.page.pageId}_${monthlyData.year}_${monthlyData.month}`,
            pageId: monthlyData.page.pageId,
            pageName: monthlyData.page.pageName,
            year: monthlyData.year,
            month: monthlyData.month,
            metrics: monthlyData.metrics,
            createdAt: monthlyData.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          const request = store.put(storageObject);
          
          request.onsuccess = () => {
            results.saved++;
            completed++;
            
            if (completed === monthlyDataList.length) {
              console.log(`Batch save completed: ${results.saved} saved, ${results.failed} failed`);
              resolve(results);
            }
          };
          
          request.onerror = () => {
            results.failed++;
            results.errors.push({
              id: storageObject.id,
              error: request.error.message
            });
            completed++;
            
            if (completed === monthlyDataList.length) {
              resolve(results);
            }
          };
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            data: monthlyData,
            error: error.message
          });
          completed++;
          
          if (completed === monthlyDataList.length) {
            resolve(results);
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Batch save failed:', error);
    throw error;
  }
}

/**
 * Hämtar månadsdata för en specifik sida och period
 * @param {string} pageId - Sido-ID
 * @param {number} year - År
 * @param {number} month - Månad
 * @returns {Promise<Object|null>} - Månadsdata eller null
 */
export async function getMonthlyData(pageId, year, month) {
  if (!pageId || !year || !month) {
    throw new Error('pageId, year och month krävs');
  }
  
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      const index = store.index('pagePeriod');
      
      const request = index.get([pageId, year, month]);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting monthly data:', error);
    throw error;
  }
}

/**
 * Hämtar all data för en specifik sida (hela tidsserien)
 * @param {string} pageId - Sido-ID
 * @returns {Promise<Array<Object>>} - Lista med månadsdata
 */
export async function getPageTimeseries(pageId) {
  if (!pageId) {
    throw new Error('pageId krävs');
  }
  
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      const index = store.index('pageId');
      
      const request = index.getAll(pageId);
      
      request.onsuccess = () => {
        // Sortera kronologiskt
        const data = request.result.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });
        
        resolve(data);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting page timeseries:', error);
    throw error;
  }
}

/**
 * Hämtar data för alla sidor för en specifik period
 * @param {number} year - År
 * @param {number} month - Månad
 * @returns {Promise<Array<Object>>} - Lista med månadsdata för alla sidor
 */
export async function getPeriodData(year, month) {
  if (!year || !month) {
    throw new Error('year och month krävs');
  }
  
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      const index = store.index('period');
      
      const request = index.getAll([year, month]);
      
      request.onsuccess = () => {
        // Sortera efter sidnamn
        const data = request.result.sort((a, b) => 
          a.pageName.localeCompare(b.pageName)
        );
        
        resolve(data);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting period data:', error);
    throw error;
  }
}

/**
 * Hämtar alla unika perioder i databasen
 * @returns {Promise<Array<Object>>} - Lista med perioder {year, month}
 */
export async function getAllPeriods() {
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const periodsSet = new Set();
        
        for (const item of request.result) {
          periodsSet.add(`${item.year}_${item.month}`);
        }
        
        const periods = Array.from(periodsSet)
          .map(key => {
            const [year, month] = key.split('_');
            return { year: parseInt(year), month: parseInt(month) };
          })
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });
        
        resolve(periods);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting all periods:', error);
    throw error;
  }
}

/**
 * Hämtar alla unika sidor i databasen
 * @returns {Promise<Array<Object>>} - Lista med sidor {pageId, pageName}
 */
export async function getAllPages() {
  try {
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
      const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const pagesMap = new Map();
        
        for (const item of request.result) {
          if (!pagesMap.has(item.pageId)) {
            pagesMap.set(item.pageId, {
              pageId: item.pageId,
              pageName: item.pageName
            });
          }
        }
        
        const pages = Array.from(pagesMap.values())
          .sort((a, b) => a.pageName.localeCompare(b.pageName));
        
        resolve(pages);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting all pages:', error);
    throw error;
  }
}

/**
 * Sparar metadata i localStorage
 * @param {Object} metadata - Metadata att spara
 */
export function saveMetadata(metadata) {
  try {
    const metadataWithTimestamp = {
      ...metadata,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(
      STORAGE_CONFIG.LOCALSTORAGE_KEYS.METADATA,
      JSON.stringify(metadataWithTimestamp)
    );
    
    console.log('Metadata saved to localStorage');
    
  } catch (error) {
    console.error('Failed to save metadata:', error);
    throw error;
  }
}

/**
 * Hämtar metadata från localStorage
 * @returns {Object|null} - Metadata eller null
 */
export function getMetadata() {
  try {
    const stored = localStorage.getItem(STORAGE_CONFIG.LOCALSTORAGE_KEYS.METADATA);
    return stored ? JSON.parse(stored) : null;
    
  } catch (error) {
    console.error('Failed to get metadata:', error);
    return null;
  }
}

/**
 * Beräknar lagringsstorlek och använd kapacitet
 * @returns {Promise<Object>} - Lagringsstatistik
 */
export async function getStorageStats() {
  try {
    // localStorage storlek
    let localStorageSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('fb_analyzer_')) {
        localStorageSize += localStorage[key].length;
      }
    }
    
    // IndexedDB storlek (approximation)
    const db = await initializeIndexedDB();
    let indexedDBSize = 0;
    let totalRecords = 0;
    
    const transaction = db.transaction([STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA], 'readonly');
    const store = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        totalRecords = request.result.length;
        
        // Approximera storlek baserat på antal poster
        indexedDBSize = totalRecords * 1024; // ~1KB per post
        
        const totalSize = localStorageSize + indexedDBSize;
        const totalLimit = STORAGE_CONFIG.LIMITS.LOCALSTORAGE_MAX + STORAGE_CONFIG.LIMITS.INDEXEDDB_MAX;
        
        resolve({
          localStorage: {
            used: localStorageSize,
            limit: STORAGE_CONFIG.LIMITS.LOCALSTORAGE_MAX,
            percentage: (localStorageSize / STORAGE_CONFIG.LIMITS.LOCALSTORAGE_MAX) * 100
          },
          indexedDB: {
            used: indexedDBSize,
            records: totalRecords,
            limit: STORAGE_CONFIG.LIMITS.INDEXEDDB_MAX,
            percentage: (indexedDBSize / STORAGE_CONFIG.LIMITS.INDEXEDDB_MAX) * 100
          },
          total: {
            used: totalSize,
            limit: totalLimit,
            percentage: (totalSize / totalLimit) * 100,
            availableSpace: totalLimit - totalSize
          }
        });
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
    
  } catch (error) {
    console.error('Error getting storage stats:', error);
    throw error;
  }
}

/**
 * Rensar all lagrad data
 * @returns {Promise<boolean>} - True om lyckad
 */
export async function clearAllData() {
  try {
    // Rensa localStorage
    for (const key of Object.values(STORAGE_CONFIG.LOCALSTORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
    
    // Rensa IndexedDB
    const db = await initializeIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA,
        STORAGE_CONFIG.INDEXEDDB.STORES.TIMESERIES
      ], 'readwrite');
      
      let cleared = 0;
      const totalStores = 2;
      
      // Rensa monthly data
      const monthlyStore = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.MONTHLY_DATA);
      const clearMonthly = monthlyStore.clear();
      
      clearMonthly.onsuccess = () => {
        cleared++;
        if (cleared === totalStores) {
          console.log('All data cleared successfully');
          resolve(true);
        }
      };
      
      // Rensa timeseries
      const timeseriesStore = transaction.objectStore(STORAGE_CONFIG.INDEXEDDB.STORES.TIMESERIES);
      const clearTimeseries = timeseriesStore.clear();
      
      clearTimeseries.onsuccess = () => {
        cleared++;
        if (cleared === totalStores) {
          console.log('All data cleared successfully');
          resolve(true);
        }
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
    
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}