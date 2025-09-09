import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, Activity, LineChart, BarChart3 } from 'lucide-react';
import { METRIC_DEFINITIONS } from '../utils/metric_categorizer';
import { calculateMonthToMonthTrend, calculateAverageTrend } from '../services/timeseries_analytics';
import { TimeseriesDataset } from '../core/timeseries_models';

// ENDAST dessa fyra metrics som ska visas
const ALLOWED_METRICS = [
  { key: 'reach', label: 'Räckvidd', canSum: false },
  { key: 'engagements', label: 'Engagemang', canSum: true },
  { key: 'reactions', label: 'Reaktioner', canSum: true },
  { key: 'publications', label: 'Publiceringar', canSum: true }
];

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

const TrendAnalysisView = ({ uploadedPeriods }) => {
  // State för linjediagram - INGA DEFAULT-VAL
  const [selectedMetric, setSelectedMetric] = useState('reach');
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // State för trendanalys
  const [showDetailedTrends, setShowDetailedTrends] = useState(false);

  // Skapa dataset från uppladdade perioder
  const dataset = useMemo(() => {
    if (!uploadedPeriods || uploadedPeriods.length === 0) {
      return null;
    }
    return new TimeseriesDataset(uploadedPeriods);
  }, [uploadedPeriods]);

  // Få alla unika sidor från uploadedPeriods (samma metod som PageTimeseriesView)
  const availablePages = useMemo(() => {
    if (!uploadedPeriods || uploadedPeriods.length === 0) {
      return [];
    }
    
    // Samla alla unika sidor från alla perioder (samma logik som PageTimeseriesView)
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

  // Månadsnamn för X-axel
  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    return months[month - 1] || month.toString();
  };

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

  // FÖRBÄTTRAD FÄRGVAL - tilldela färger baserat på ordning av valda sidor
  const getPageColor = (pageId, selectedPageIds) => {
    const index = selectedPageIds.indexOf(pageId);
    return index >= 0 ? CHART_COLORS[index % CHART_COLORS.length] : CHART_COLORS[0];
  };

  // NYA FUNKTIONER FÖR FÖRBÄTTRAD Y-AXEL
  // Beräkna smart Y-axel skalning som hanterar alla talstorlekar
  const calculateSmartYAxis = (maxValue) => {
    if (maxValue === 0) {
      return { min: 0, max: 100, step: 20, format: 'number' };
    }

    // Bestäm skalningsnivå baserat på maxValue
    let step, max, format;
    
    if (maxValue <= 1000) {
      // Under 1000: använd 100-tal eller 200-tal
      if (maxValue <= 500) {
        step = 100;
      } else {
        step = 200;
      }
      max = Math.ceil(maxValue / step) * step;
      format = 'number';
    } 
    else if (maxValue <= 10000) {
      // 1K-10K: använd 1000-tal eller 2000-tal
      if (maxValue <= 5000) {
        step = 1000;
      } else {
        step = 2000;
      }
      max = Math.ceil(maxValue / step) * step;
      format = 'thousands';
    }
    else if (maxValue <= 100000) {
      // 10K-100K: använd 10000-tal eller 20000-tal
      if (maxValue <= 50000) {
        step = 10000;
      } else {
        step = 20000;
      }
      max = Math.ceil(maxValue / step) * step;
      format = 'thousands';
    }
    else if (maxValue <= 1000000) {
      // 100K-1M: använd 100000-tal eller 200000-tal
      if (maxValue <= 500000) {
        step = 100000;
      } else {
        step = 200000;
      }
      max = Math.ceil(maxValue / step) * step;
      format = 'thousands';
    }
    else {
      // Över 1M: använd miljoner
      if (maxValue <= 5000000) {
        step = 1000000;
      } else if (maxValue <= 10000000) {
        step = 2000000;
      } else {
        step = 5000000;
      }
      max = Math.ceil(maxValue / step) * step;
      format = 'millions';
    }

    return { min: 0, max, step, format };
  };

  // Formatera Y-axel värden baserat på format-typ
  const formatYAxisValue = (value, format) => {
    if (value === 0) return '0';
    
    switch (format) {
      case 'number':
        return value.toLocaleString('sv-SE');
      case 'thousands':
        if (value >= 1000) {
          return `${(value / 1000).toLocaleString('sv-SE')}k`;
        }
        return value.toLocaleString('sv-SE');
      case 'millions':
        if (value >= 1000000) {
          return `${(value / 1000000).toLocaleString('sv-SE')}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toLocaleString('sv-SE')}k`;
        }
        return value.toLocaleString('sv-SE');
      default:
        return value.toLocaleString('sv-SE');
    }
  };

  // Generera Y-axel steg för SVG-rendering
  const generateYAxisSteps = (yAxisConfig) => {
    const steps = [];
    const { min, max, step } = yAxisConfig;
    
    for (let value = min; value <= max; value += step) {
      steps.push(value);
    }
    
    return steps;
  };

// DEL_1_SLUTAR_HÄR - Fortsätt med del 2 som börjar med handleExportCSV
// DEL_2_BÖRJAR_HÄR - Fortsättning från del 1 med handleExportCSV

  // FIXAD PNG-export funktion med korrekt aspect ratio
  const exportChartAsPNG = () => {
    const svg = document.querySelector('#trend-chart-svg');
    if (!svg || chartLines.length === 0) return;

    // Skapa en canvas för export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // KORRIGERAT: Behåll SVG:ens aspect ratio (1000x500 = 2:1)
    const aspectRatio = 2; // 1000/500 = 2
    const exportWidth = 1600; // Hög kvalitet för PPT
    const exportHeight = exportWidth / aspectRatio; // 800px för korrekt ratio
    
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    
    // Vit bakgrund för PPT
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Konvertera SVG till PNG via HTML5 Canvas
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL;
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      // KORRIGERAT: Rita SVG med korrekt skalning och positionering
      const titleHeight = 80;
      const footerHeight = 120;
      const chartHeight = exportHeight - titleHeight - footerHeight;
      
      // Rita SVG-diagrammet med korrekt skalning
      ctx.drawImage(img, 0, titleHeight, exportWidth, chartHeight);
      
      // Lägg till prominent titel
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      const title = `Utveckling över tid - ${METRIC_DEFINITIONS[selectedMetric]?.displayName}`;
      ctx.fillText(title, exportWidth / 2, 50);
      
      // Lägg till konto-information
      ctx.fillStyle = '#4b5563';
      ctx.font = '24px Arial, sans-serif';
      const selectedPageNames = chartLines.map(line => line.pageName);
      const accountText = selectedPageNames.length === 1 
        ? `Konto: ${selectedPageNames[0]}`
        : `Konton: ${selectedPageNames.join(', ')}`;
      
      // Hantera lång text genom att dela upp i rader om nödvändigt
      const maxWidth = exportWidth - 200;
      const words = accountText.split(' ');
      let line = '';
      let y = exportHeight - 60;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, exportWidth / 2, y);
          line = words[n] + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, exportWidth / 2, y);
      
      // Exportera som PNG
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Inkludera kontonamn i filnamnet
        const kontoSuffix = selectedPageNames.length === 1 
          ? selectedPageNames[0].replace(/[^a-zA-Z0-9]/g, '-')
          : `${selectedPageNames.length}-konton`;
        a.download = `trend-analys-${selectedMetric}-${kontoSuffix}-${new Date().toISOString().slice(0, 10)}.png`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
      
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  // Hantera sidval med checkboxar (samma som andra flikar)
  const handlePageToggle = (pageId) => {
    setSelectedPages(current => 
      current.includes(pageId) 
        ? current.filter(id => id !== pageId)
        : [...current, pageId]
    );
  };

  // Hantera metric-val med radio buttons
  const handleMetricToggle = (metricKey) => {
    setSelectedMetric(metricKey);
  };

  // Hantera periodval
  const handlePeriodToggle = (period) => {
    const periodKey = `${period.year}-${period.month}`;
    setSelectedPeriods(current => {
      const exists = current.find(p => `${p.year}-${p.month}` === periodKey);
      return exists 
        ? current.filter(p => `${p.year}-${p.month}` !== periodKey)
        : [...current, period];
    });
  };

  // Beräkna om alla perioder är valda - FIXAD LOGIK
  const allPeriodsSelected = useMemo(() => {
    return selectedPeriods.length > 0 && selectedPeriods.length === availablePeriods.length;
  }, [selectedPeriods.length, availablePeriods.length]);
  
  const handleToggleAllPeriods = () => {
    if (allPeriodsSelected) {
      setSelectedPeriods([]); // Avmarkera alla
    } else {
      setSelectedPeriods(availablePeriods); // Markera alla
    }
  };
  // Generera linjediagram-data - KRÄVER BÅDE SIDOR OCH PERIODER
  const generateChartData = useMemo(() => {
    if (!uploadedPeriods || selectedPages.length === 0 || selectedPeriods.length === 0) {
      return [];
    }

    const chartPoints = [];
    // FIXAT: Använd endast valda perioder, INGEN fallback till availablePeriods
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
          color: getPageColor(point.pageId, selectedPages) // Använd förbättrad färgval
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

  // UPPDATERAD Y-axel range med smart skalning
  const yAxisConfig = useMemo(() => {
    if (generateChartData.length === 0) {
      return calculateSmartYAxis(100); // Default för tom data
    }
    
    const values = generateChartData.map(d => d.value);
    const maxValue = Math.max(...values);
    
    return calculateSmartYAxis(maxValue);
  }, [generateChartData]);

  // MJUK KURV-FUNKTION (Catmull-Rom spline)
  const createSmoothPath = (points) => {
    if (points.length < 2) return '';
    
    // För få punkter för mjuk kurva, använd vanlig linje
    if (points.length === 2) {
      const [p1, p2] = points;
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    
    // Skapa mjuk kurva med quadratic Bézier curves
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];
      
      if (i === 1) {
        // Första kurvan
        const next = points[i + 1] || current;
        const cp1x = previous.x + (current.x - previous.x) * 0.3;
        const cp1y = previous.y + (current.y - previous.y) * 0.3;
        const cp2x = current.x - (next.x - previous.x) * 0.1;
        const cp2y = current.y - (next.y - previous.y) * 0.1;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
      } else if (i === points.length - 1) {
        // Sista kurvan
        const beforePrev = points[i - 2] || previous;
        const cp1x = previous.x + (current.x - beforePrev.x) * 0.1;
        const cp1y = previous.y + (current.y - beforePrev.y) * 0.1;
        const cp2x = current.x - (current.x - previous.x) * 0.3;
        const cp2y = current.y - (current.y - previous.y) * 0.3;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
      } else {
        // Mellanliggande kurvor
        const next = points[i + 1];
        const beforePrev = points[i - 2] || previous;
        const cp1x = previous.x + (current.x - beforePrev.x) * 0.1;
        const cp1y = previous.y + (current.y - beforePrev.y) * 0.1;
        const cp2x = current.x - (next.x - previous.x) * 0.1;
        const cp2y = current.y - (next.y - previous.y) * 0.1;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
      }
    }
    
    return path;
  };

  // Hantera mouse events för tooltip
  const handleMouseMove = (event, point) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    setHoveredDataPoint(point);
  };

  if (!uploadedPeriods || uploadedPeriods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trendanalys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ladda upp minst två månadsfiler för att se trendanalys.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Linjediagram-sektion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Utveckling över tid
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportChartAsPNG} variant="outline" size="sm" disabled={chartLines.length === 0}>
              📊 Exportera PNG
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kontroller FÖRST - KORREKT ORDNING: Sidor, Datapunkt, Perioder */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* FÖRSTA: Sidval med checkboxar (samma som andra flikar) */}
            <div>
              <label className="text-sm font-medium mb-2 block">Välj Facebook-sidor ({selectedPages.length} valda)</label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availablePages.map(page => {
                  const isSelected = selectedPages.includes(page.pageId);
                  
                  return (
                    <label key={page.pageId} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePageToggle(page.pageId)}
                        className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
                      />
                      <span className="text-sm font-medium">{page.pageName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ANDRA: Datapunkt-väljare - UTAN summerings-kommentar för reach */}
            <div>
              <label className="text-sm font-medium mb-2 block">Välj datapunkt</label>
              <div className="space-y-2">
                {ALLOWED_METRICS.map(metric => {
                  const isSelected = selectedMetric === metric.key;
                  
                  return (
                    <label key={metric.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="metric"
                        checked={isSelected}
                        onChange={() => handleMetricToggle(metric.key)}
                        className="h-4 w-4 text-facebook-500 border-gray-300 focus:ring-facebook-500"
                      />
                      <span className="text-sm font-medium">{metric.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* TREDJE: Periodval med "Välj alla" checkbox - FIXAD RÄKNING */}
            <div>
              <label className="text-sm font-medium mb-2 block">Välj perioder ({selectedPeriods.length} valda)</label>
              
              {/* Välj alla checkbox */}
              <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={allPeriodsSelected}
                  onChange={handleToggleAllPeriods}
                  className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
                />
                <span className="text-sm font-medium">Välj alla perioder</span>
              </label>

              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {availablePeriods.map(period => {
                  const isSelected = selectedPeriods.some(p => p.year === period.year && p.month === period.month);
                  
                  return (
                    <label key={`${period.year}-${period.month}`} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePeriodToggle(period)}
                        className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
                      />
                      <span className="text-sm font-medium">
                        {getMonthName(period.month)} {period.year}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PROMINENT DATAPUNKT-VISNING - FLYTTAD EFTER KONTROLLER */}
          {selectedMetric && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-blue-900">
                Visar: {METRIC_DEFINITIONS[selectedMetric]?.displayName}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Aktuell datapunkt som visas i diagrammet
              </p>
            </div>
          )}

          {/* Linjediagram */}
          {chartLines.length > 0 ? (
            <div className="space-y-4">
              {/* Legenda */}
              <div className="flex flex-wrap gap-3">
                {chartLines.map(line => (
                  <div key={line.pageId} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="text-sm font-medium">{line.pageName}</span>
                  </div>
                ))}
              </div>

              {/* SVG Diagram - UPPDATERAD MED NY Y-AXEL OCH ÖKAT AVSTÅND */}
              <div className="relative">
                <svg 
                  id="trend-chart-svg"
                  width="100%" 
                  height="500" 
                  viewBox="0 0 1000 500"
                  className="border rounded bg-gray-50"
                  onMouseLeave={() => setHoveredDataPoint(null)}
                >
                  {/* Grid-linjer */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* UPPDATERAD Y-axel med smart skalning OCH ÖKAT AVSTÅND */}
                  {generateYAxisSteps(yAxisConfig).map(value => {
                    const yPos = 450 - ((value - yAxisConfig.min) / (yAxisConfig.max - yAxisConfig.min)) * 380;
                    return (
                      <g key={value}>
                        <line x1="70" y1={yPos} x2="930" y2={yPos} stroke="#d1d5db" strokeWidth="1"/>
                        <text x="55" y={yPos + 4} textAnchor="end" fontSize="14" fill="#6b7280">
                          {formatYAxisValue(value, yAxisConfig.format)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axel månader */}
                  {availablePeriods.map((period, index) => {
                    const xPos = 70 + (index / Math.max(1, availablePeriods.length - 1)) * 860;
                    return (
                      <g key={`${period.year}-${period.month}`}>
                        <line x1={xPos} y1="70" x2={xPos} y2="450" stroke="#d1d5db" strokeWidth="1"/>
                        <text x={xPos} y="475" textAnchor="middle" fontSize="14" fill="#6b7280">
                          {getMonthName(period.month)}
                        </text>
                        <text x={xPos} y="490" textAnchor="middle" fontSize="12" fill="#9ca3af">
                          {period.year}
                        </text>
                      </g>
                    );
                  })}

                  {/* MJUKA KURVORNA med uppdaterad Y-skalning */}
                  {chartLines.map(line => {
                    if (line.points.length < 1) return null;

                    // Beräkna koordinater för alla punkter med ny Y-axel
                    const pathPoints = line.points.map((point, index) => {
                      const periodIndex = availablePeriods.findIndex(p => 
                        `${p.year}-${p.month.toString().padStart(2, '0')}` === point.periodKey
                      );
                      const x = 70 + (periodIndex / Math.max(1, availablePeriods.length - 1)) * 860;
                      const y = 450 - ((point.value - yAxisConfig.min) / (yAxisConfig.max - yAxisConfig.min)) * 380;
                      
                      return { x, y, point };
                    });

                    return (
                      <g key={line.pageId}>
                        {/* MJUK KURVA istället för hård linje */}
                        {line.points.length > 1 && (
                          <path
                            d={createSmoothPath(pathPoints)}
                            fill="none"
                            stroke={line.color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        
                        {/* Punkter */}
                        {pathPoints.map(({ x, y, point }, index) => (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="6"
                            fill={line.color}
                            stroke="white"
                            strokeWidth="3"
                            className="cursor-pointer"
                            onMouseEnter={(e) => handleMouseMove(e, point)}
                            onMouseLeave={() => setHoveredDataPoint(null)}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* FÖRBÄTTRAD TOOLTIP med dynamisk positionering */}
                  {hoveredDataPoint && (
                    <g>
                      {/* Beräkna tooltip-position baserat på muspekaren */}
                      {(() => {
                        // Tooltip ska vara 200px bred och 70px hög
                        const tooltipWidth = 200;
                        const tooltipHeight = 70;
                        let tooltipX = mousePosition.x + 15;
                        let tooltipY = mousePosition.y - 35;
                        
                        // Justera om tooltip går utanför höger kant
                        if (tooltipX + tooltipWidth > 980) {
                          tooltipX = mousePosition.x - tooltipWidth - 15;
                        }
                        
                        // Justera om tooltip går utanför övre kant
                        if (tooltipY < 15) {
                          tooltipY = mousePosition.y + 15;
                        }
                        
                        // Justera om tooltip går utanför nedre kant
                        if (tooltipY + tooltipHeight > 480) {
                          tooltipY = mousePosition.y - tooltipHeight - 15;
                        }
                        
                        return (
                          <>
                            <rect
                              x={tooltipX} y={tooltipY} 
                              width={tooltipWidth} height={tooltipHeight}
                              fill="rgba(0,0,0,0.85)" rx="6"
                            />
                            <text x={tooltipX + 12} y={tooltipY + 20} fill="white" fontSize="13" fontWeight="bold">
                              {hoveredDataPoint.pageName}
                            </text>
                            <text x={tooltipX + 12} y={tooltipY + 38} fill="white" fontSize="12">
                              {hoveredDataPoint.period}
                            </text>
                            <text x={tooltipX + 12} y={tooltipY + 55} fill="white" fontSize="12">
                              {METRIC_DEFINITIONS[hoveredDataPoint.metric]?.displayName}: {hoveredDataPoint.value.toLocaleString()}
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  )}
                </svg>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Välj sidor och perioder för att visa diagram</p>
              <p className="text-sm">
                {selectedPages.length === 0 && selectedPeriods.length === 0 
                  ? "Markera minst en Facebook-sida och period"
                  : selectedPages.length === 0 
                  ? "Markera minst en Facebook-sida i listan ovan"
                  : "Markera minst en period i listan ovan"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendAnalysisView;