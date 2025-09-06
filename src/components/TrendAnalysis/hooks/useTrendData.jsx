import { useMemo } from 'react';

// FÖRBÄTTRADE FÄRGER - tydligt åtskilda färger som tilldelas i ordning
const CHART_COLORS = [
  '#2563EB', // Blå
  '#16A34A', // Grön
  '#EAB308', // Gul/guld
  '#DC2626', // Röd
  '#7C3AED', // Lila
  '#EA580C', // Orange
  '#0891B2', // Cyan
  '#BE185D', // Rosa/magenta
  '#059669', // Emerald
  '#7C2D12', // Brun
  '#4338CA', // Indigo
  '#C2410C'  // Orange-röd
];

export const useTrendData = ({ 
  uploadedPeriods, 
  selectedPages, 
  selectedPeriods, 
  selectedMetric, 
  dataset 
}) => {
  // Få alla unika sidor från uploadedPeriods
  const availablePages = useMemo(() => {
    if (!uploadedPeriods || uploadedPeriods.length === 0) {
      return [];
    }
    
    const pagesMap = new Map();
    
    uploadedPeriods.forEach(period => {
      if (period.data && Array.isArray(period.data)) {
        period.data.forEach(csvRow => {
          const pageName = csvRow.Page || csvRow.page || 'Okänd sida';
          const pageId = csvRow['Page ID'] || csvRow.pageId || `page_${pageName.replace(/\s+/g, '_')}`;
          
          if (!pagesMap.has(pageId)) {
            pagesMap.set(pageId, {
              pageId,
              pageName
            });
          }
        });
      }
    });
    
    return Array.from(pagesMap.values()).sort((a, b) => 
      a.pageName.localeCompare(b.pageName)
    );
  }, [uploadedPeriods]);

  // Få alla tillgängliga perioder sorterade
  const availablePeriods = useMemo(() => {
    if (!uploadedPeriods) return [];
    
    return uploadedPeriods
      .map(period => ({
        ...period,
        sortKey: period.year * 100 + period.month
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [uploadedPeriods]);

  // Mappa metric-nycklar till exakta CSV-kolumnnamn
  const getCSVColumnName = (metricKey) => {
    const mapping = {
      'reach': 'Reach',
      'engagements': 'Engagements', 
      'reactions': 'Reactions',
      'publications': 'Publications'
    };
    return mapping[metricKey] || metricKey;
  };

  // Månadsnamn för visning
  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    return months[month - 1] || month.toString();
  };

  // Färgval för sidor baserat på ordning
  const getPageColor = (pageId, selectedPageIds) => {
    const index = selectedPageIds.indexOf(pageId);
    return index >= 0 ? CHART_COLORS[index % CHART_COLORS.length] : CHART_COLORS[0];
  };

  // Generera linjediagram-data
  const generateChartData = useMemo(() => {
    if (!uploadedPeriods || selectedPages.length === 0 || selectedPeriods.length === 0) {
      return [];
    }

    const chartPoints = [];
    const periodsToShow = selectedPeriods;
    
    periodsToShow.forEach(period => {
      if (period.data && Array.isArray(period.data)) {
        selectedPages.forEach(pageId => {
          const csvRow = period.data.find(row => {
            const rowPageId = row['Page ID'] || row.pageId || `page_${(row.Page || row.page || '').replace(/\s+/g, '_')}`;
            return rowPageId === pageId;
          });
          
          if (csvRow) {
            // Läs värde från rätt CSV-kolumn
            const csvColumnName = getCSVColumnName(selectedMetric);
            const rawValue = csvRow[csvColumnName];
            
            // Hantera olika format för numeriska värden
            let value = 0;
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
              // Ta bort kommatecken och andra formateringstecken
              const cleanValue = String(rawValue).replace(/[,\s]/g, '');
              value = parseFloat(cleanValue) || 0;
            }
            
            chartPoints.push({
              periodKey: `${period.year}-${period.month.toString().padStart(2, '0')}`,
              period: `${getMonthName(period.month)} ${period.year}`,
              month: getMonthName(period.month),
              year: period.year,
              pageId,
              pageName: csvRow.Page || csvRow.page || 'Okänd sida',
              value,
              metric: selectedMetric
            });
          }
        });
      }
    });

    return chartPoints;
  }, [uploadedPeriods, selectedPages, selectedPeriods, selectedMetric]);

  // Gruppera data per sida för linjediagram
  const chartLines = useMemo(() => {
    const groupedByPage = new Map();
    
    generateChartData.forEach(point => {
      if (!groupedByPage.has(point.pageId)) {
        groupedByPage.set(point.pageId, {
          pageId: point.pageId,
          pageName: point.pageName,
          points: [],
          color: getPageColor(point.pageId, selectedPages)
        });
      }
      groupedByPage.get(point.pageId).points.push(point);
    });

    // Sortera punkter per period för varje linje
    groupedByPage.forEach(line => {
      line.points.sort((a, b) => a.periodKey.localeCompare(b.periodKey));
    });

    return Array.from(groupedByPage.values());
  }, [generateChartData, selectedPages]);

  // Beräkna Y-axel range
  const yAxisRange = useMemo(() => {
    if (generateChartData.length === 0) return { min: 0, max: 100 };
    
    const values = generateChartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [generateChartData]);

  return {
    availablePages,
    availablePeriods,
    chartLines,
    yAxisRange,
    generateChartData
  };
};