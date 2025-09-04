import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target
} from 'lucide-react';

// Sveriges Radio kanal-färger (från original)
const CHANNEL_COLORS = {
  'P1': '#0066cc', // Blå
  'P2': '#ff6600', // Orange
  'P3': '#00cc66', // Grön
  'P4': '#cc33cc', // Magenta/Lila
  'EKOT': '#005eb8', // Mörk blå (Ekot/Radio Sweden)
  'RADIOSPORTEN': '#1c5c35', // Mörk grön (Radiosporten)
  'SR': '#000000',  // Svart för Sveriges Radio
  'default': '#000000' // Svart som fallback
};

// ProfileIcon-komponent för Sveriges Radio kanaler (KORRIGERAD)
const ProfileIcon = ({ pageName }) => {
  // Extrahera namn från sidnamnet
  const name = pageName || 'Okänd';
  
  // Bestäm färg och kanal-text baserat på kanalnamn i sidnamnet
  let backgroundColor = CHANNEL_COLORS.default;
  let channelText = '';
  
  // Kontrollera om sidnamnet innehåller något av kanalnamnen
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('ekot') || nameLower.includes('radio sweden')) {
    backgroundColor = CHANNEL_COLORS.EKOT;
    channelText = 'E';
  } else if (nameLower.includes('radiosporten') || nameLower.includes('radio sporten')) {
    backgroundColor = CHANNEL_COLORS.RADIOSPORTEN;
    channelText = 'RS';
  } else if (nameLower.includes('p1')) {
    backgroundColor = CHANNEL_COLORS.P1;
    channelText = 'P1';
  } else if (nameLower.includes('p2')) {
    backgroundColor = CHANNEL_COLORS.P2;
    channelText = 'P2';
  } else if (nameLower.includes('p3')) {
    backgroundColor = CHANNEL_COLORS.P3;
    channelText = 'P3';
  } else if (nameLower.includes('p4')) {
    backgroundColor = CHANNEL_COLORS.P4;
    channelText = 'P4';
  } else if (nameLower.includes('sveriges radio') && !nameLower.includes('p1') && 
            !nameLower.includes('p2') && !nameLower.includes('p3') && !nameLower.includes('p4')) {
    // Sveriges Radio, men inte specifik kanal
    backgroundColor = CHANNEL_COLORS.SR;
    channelText = 'SR';
  } else {
    // Fallback: använd första bokstaven om ingen kanal hittas
    channelText = name.charAt(0).toUpperCase();
  }
  
  // Bestäm textfärg baserat på bakgrundsfärgen (vit text på mörka bakgrunder)
  const isLightBackground = backgroundColor === CHANNEL_COLORS.P2 || backgroundColor === CHANNEL_COLORS.P3;
  const textColor = isLightBackground ? 'text-black' : 'text-white';
  
  return (
    <div 
      className={`flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold ${textColor}`}
      style={{ backgroundColor }}
      title={pageName}
    >
      {channelText}
    </div>
  );
};

// Sidstorlekar för paginering
const PAGE_SIZE_OPTIONS = [
  { value: 6, label: '6 per sida' },
  { value: 12, label: '12 per sida' },
  { value: 24, label: '24 per sida' }
];

// KORRIGERAT: Tillgängliga metrics (utan Engaged Users + rätt svenska namn)
const AVAILABLE_METRICS = [
  { key: 'reach', label: 'Räckvidd', canSum: false },
  { key: 'engagements', label: 'Engagemang', canSum: true },
  { key: 'reactions', label: 'Reaktioner', canSum: true },
  { key: 'publications', label: 'Publiceringar', canSum: true },
  { key: 'status', label: 'Status', canSum: true },
  { key: 'comment', label: 'Kommentarer', canSum: true }
];

// Metric-definitioner (korrigerade)
const METRIC_DEFINITIONS = {
  reach: { displayName: 'Räckvidd', canSumAcrossPages: false, category: 'unique_persons' },
  engagements: { displayName: 'Engagemang', canSumAcrossPages: true, category: 'countable' },
  reactions: { displayName: 'Reaktioner', canSumAcrossPages: true, category: 'countable' },
  publications: { displayName: 'Publiceringar', canSumAcrossPages: true, category: 'countable' },
  status: { displayName: 'Status', canSumAcrossPages: true, category: 'countable' },
  comment: { displayName: 'Kommentarer', canSumAcrossPages: true, category: 'countable' }
};

function PageTimeseriesView({ uploadedPeriods = [] }) {
  // State management
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [pageTimeseriesData, setPageTimeseriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Analys-state
  const [pageStats, setPageStats] = useState(null);
  const [trendAnalysis, setTrendAnalysis] = useState({});
  
  // Tabell-state
  const [sortConfig, setSortConfig] = useState({ key: 'year_month', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedMetrics, setSelectedMetrics] = useState(['reach', 'engagements', 'publications']);

  // Ladda tillgängliga sidor vid montering
  useEffect(() => {
    const loadPages = () => {
      try {
        setLoading(true);
        
        if (uploadedPeriods.length === 0) {
          setAvailablePages([]);
          setLoading(false);
          return;
        }
        
        // Samla alla unika sidor från alla perioder
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
        
        const pages = Array.from(pagesMap.values()).sort((a, b) => 
          a.pageName.localeCompare(b.pageName)
        );
        
        setAvailablePages(pages);
        
        // Sätt första sidan som default
        if (pages.length > 0) {
          setSelectedPageId(pages[0].pageId);
        }
        
      } catch (err) {
        console.error('Error loading pages:', err);
        setError('Kunde inte ladda tillgängliga Facebook-sidor');
      } finally {
        setLoading(false);
      }
    };
    
    loadPages();
  }, [uploadedPeriods]);

  // Ladda data när vald sida ändras
  useEffect(() => {
    if (!selectedPageId || uploadedPeriods.length === 0) return;
    
    const loadPageData = () => {
      try {
        setLoading(true);
        setError(null);
        
        // Samla all data för vald sida från alla perioder
        const pageData = [];
        
        uploadedPeriods.forEach(period => {
          if (period.data && Array.isArray(period.data)) {
            const pageRow = period.data.find(csvRow => {
              const pageId = csvRow['Page ID'] || csvRow.pageId || `page_${(csvRow.Page || csvRow.page || '').replace(/\s+/g, '_')}`;
              return pageId === selectedPageId;
            });
            
            if (pageRow) {
              pageData.push({
                year: period.year,
                month: period.month,
                pageName: pageRow.Page || pageRow.page || 'Okänd sida',
                pageId: selectedPageId,
                metrics: {
                  reach: parseNumericValue(pageRow.Reach || pageRow.reach),
                  engagements: parseNumericValue(pageRow.Engagements || pageRow.engagements),
                  reactions: parseNumericValue(pageRow.Reactions || pageRow.reactions),
                  publications: parseNumericValue(pageRow.Publications || pageRow.publications),
                  status: parseNumericValue(pageRow.Status || pageRow.status),
                  comment: parseNumericValue(pageRow.Comment || pageRow.comment)
                }
              });
            }
          }
        });
        
        if (pageData.length === 0) {
          const selectedPage = availablePages.find(p => p.pageId === selectedPageId);
          setError(`Ingen tidserie-data hittades för ${selectedPage?.pageName || 'vald sida'}`);
          return;
        }
        
        // Sortera data kronologiskt (senaste först som default)
        const sortedData = pageData.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        
        setPageTimeseriesData(sortedData);
        
        // Beräkna statistik för sidan
        calculatePageStatistics(sortedData);
        
      } catch (err) {
        console.error('Error loading page timeseries:', err);
        const selectedPage = availablePages.find(p => p.pageId === selectedPageId);
        setError(`Kunde inte ladda data för ${selectedPage?.pageName || 'vald sida'}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadPageData();
  }, [selectedPageId, uploadedPeriods, availablePages]);

  // Parse numeriskt värde säkert
  const parseNumericValue = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/[,\s]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

// DEL_1_SLUTAR_HÄR - Fortsätt med del 2 som börjar med calculatePageStatistics
// DEL_2_BÖRJAR_HÄR - Fortsättning från del 1 med calculatePageStatistics

  // Beräkna statistik för sidan (KORRIGERAT)
  const calculatePageStatistics = (data) => {
    if (data.length === 0) return;
    
    const selectedPage = availablePages.find(p => p.pageId === selectedPageId);
    
    const stats = {
      pageName: selectedPage?.pageName || data[0]?.pageName || 'Okänd sida',
      totalPeriods: data.length,
      firstPeriod: data[data.length - 1], // Äldsta (slutet av sorterad array)
      lastPeriod: data[0], // Senaste (början av sorterad array)
      metrics: {}
    };
    
    // KORRIGERAT: Beräkna statistik för varje metric (utan status & comment)
    const availableMetricKeys = ['reach', 'engagements', 'reactions', 'publications'];
    for (const metric of availableMetricKeys) {
      const values = data.map(d => d.metrics[metric]).filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Hitta bästa och sämsta månader
        const bestMonth = data.find(d => d.metrics[metric] === max);
        const worstMonth = data.find(d => d.metrics[metric] === min);
        
        stats.metrics[metric] = {
          average: Math.round(avg),
          min,
          max,
          bestMonth: bestMonth ? { year: bestMonth.year, month: bestMonth.month, value: max } : null,
          worstMonth: worstMonth ? { year: worstMonth.year, month: worstMonth.month, value: min } : null
        };
      }
    }
    
    setPageStats(stats);
    
    // Beräkna trend-analys för valda metrics
    const trends = {};
    for (const metric of selectedMetrics) {
      if (data.length >= 2) {
        // Förenklad trend-beräkning (första vs senaste)
        const oldestValue = data[data.length - 1]?.metrics[metric] || 0;
        const latestValue = data[0]?.metrics[metric] || 0;
        
        const change = latestValue - oldestValue;
        const percentChange = oldestValue > 0 ? ((change / oldestValue) * 100) : 0;
        
        trends[metric] = {
          change,
          percentChange: Math.round(percentChange * 10) / 10,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    }
    
    setTrendAnalysis(trends);
  };

  // Hjälpfunktion för månadsnamn
  const getMonthName = (month) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
    ];
    return months[month - 1];
  };

  // Sortera data
  const sortedData = useMemo(() => {
    if (!pageTimeseriesData.length) return [];
    
    return [...pageTimeseriesData].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'year_month') {
        aValue = a.year * 100 + a.month;
        bValue = b.year * 100 + b.month;
      } else {
        aValue = a.metrics[sortConfig.key] || 0;
        bValue = b.metrics[sortConfig.key] || 0;
      }
      
      const comparison = aValue - bValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [pageTimeseriesData, sortConfig]);

  // Paginering
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Hantera sortering
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Få sorterings-ikon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // KORRIGERAT: Hantera metric-val med checkboxar
  const handleMetricToggle = (metricKey) => {
    setSelectedMetrics(current => 
      current.includes(metricKey) 
        ? current.filter(m => m !== metricKey)
        : [...current, metricKey]
    );
  };

  // Export till CSV
  const handleExportCSV = () => {
    const selectedPage = availablePages.find(p => p.pageId === selectedPageId);
    const headers = ['År', 'Månad', 'Period', ...selectedMetrics.map(m => {
      const def = METRIC_DEFINITIONS[m];
      return def ? def.displayName : m;
    })];
    
    const csvData = sortedData.map(item => [
      item.year,
      item.month,
      `${getMonthName(item.month)} ${item.year}`,
      ...selectedMetrics.map(m => item.metrics[m] || 0)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedPage?.pageName.replace(/[^a-zA-Z0-9]/g, '_')}_tidsserie.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatera numeriska värden
  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('sv-SE').format(value);
  };

  // Hitta bästa och sämsta värden för prestanda-highlighting
  const getPerformanceClass = (metric, value, data) => {
    if (!data || data.length < 2 || value === null || value === undefined) return '';
    
    const values = data.map(d => d.metrics[metric]).filter(v => v !== null && v !== undefined && !isNaN(v));
    if (values.length < 2) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (value === max && max !== min) return 'bg-green-100 text-green-800 font-medium';
    if (value === min && max !== min) return 'bg-red-100 text-red-800 font-medium';
    return '';
  };

  if (loading) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Laddar data</AlertTitle>
        <AlertDescription>
          Analyserar tidserie-data för Facebook-sidor...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (availablePages.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Inga sidor hittades</AlertTitle>
        <AlertDescription>
          Kunde inte hitta några Facebook-sidor i den uppladdade datan.
        </AlertDescription>
      </Alert>
    );
  }

  const selectedPage = availablePages.find(p => p.pageId === selectedPageId);

  return (
    <div className="space-y-6">
      {/* Sida-väljare och kontroller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-facebook-500" />
            Sidanalys över tid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Välj Facebook-sida</label>
              <Select 
                value={selectedPageId}
                onValueChange={setSelectedPageId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj sida att analysera" />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map(page => (
                    <SelectItem key={page.pageId} value={page.pageId}>
                      <div className="flex items-center gap-2">
                        <ProfileIcon pageName={page.pageName} />
                        <span>{page.pageName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPage && (
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {selectedPage.pageId}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Metrics att visa</label>
              {/* KORRIGERAT: Checkboxar istället för knappar */}
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_METRICS.map(metric => {
                  const isSelected = selectedMetrics.includes(metric.key);
                  
                  return (
                    <label key={metric.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMetricToggle(metric.key)}
                        className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
                      />
                      <span className="text-sm font-medium">{metric.label}</span>
                      {!metric.canSum && (
                        <span className="text-xs text-orange-600 font-medium">*</span>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * = Kan inte summeras över månader (unika personer)
              </p>
            </div>
          </div>

          {/* Statistik-sammanfattning */}
          {pageStats && (
            <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-facebook-600 flex items-center justify-center gap-2">
                  <ProfileIcon pageName={pageStats.pageName} />
                  {pageStats.totalPeriods}
                </div>
                <div className="text-sm text-muted-foreground">Månader data</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {getMonthName(pageStats.firstPeriod.month)} {pageStats.firstPeriod.year}
                </div>
                <div className="text-sm text-muted-foreground">Första månad</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {getMonthName(pageStats.lastPeriod.month)} {pageStats.lastPeriod.year}
                </div>
                <div className="text-sm text-muted-foreground">Senaste månad</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-facebook-600">
                  {selectedPage?.pageName || 'Okänd sida'}
                </div>
                <div className="text-sm text-muted-foreground">Vald sida</div>
              </div>
            </div>
          )}

          {/* Trend-indikatorer för valda metrics */}
          {Object.keys(trendAnalysis).length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {selectedMetrics.slice(0, 3).map(metric => {
                const trend = trendAnalysis[metric];
                const definition = METRIC_DEFINITIONS[metric];
                
                if (!trend || !definition) return null;
                
                return (
                  <div key={metric} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    {trend.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
                    {trend.trend === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
                    {trend.trend === 'stable' && <Activity className="h-5 w-5 text-gray-500" />}
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm">{definition.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {trend.percentChange > 0 ? '+' : ''}{trend.percentChange}% sedan första månad
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tidserie-tabell */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Månadsvis utveckling - {selectedPage?.pageName || 'Okänd sida'}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pageTimeseriesData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Ingen tidserie-data tillgänglig för vald sida
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('year_month')}
                    >
                      <div className="flex items-center">
                        Period
                        {getSortIcon('year_month')}
                      </div>
                    </TableHead>
                    {selectedMetrics.map(metric => {
                      const definition = METRIC_DEFINITIONS[metric];
                      return (
                        <TableHead 
                          key={metric}
                          className="text-right cursor-pointer select-none"
                          onClick={() => handleSort(metric)}
                        >
                          <div className="flex items-center justify-end">
                            {definition?.displayName || metric}
                            {getSortIcon(metric)}
                            {!definition?.canSumAcrossPages && (
                              <span className="ml-1 text-orange-600">*</span>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item, index) => (
                    <TableRow key={`${item.year}_${item.month}`}>
                      <TableCell className="font-medium">
                        {getMonthName(item.month)} {item.year}
                      </TableCell>
                      {selectedMetrics.map(metric => (
                        <TableCell 
                          key={metric}
                          className="text-right"
                        >
                          <div className="flex items-center justify-end gap-1">
                            {formatValue(item.metrics[metric])}
                            {pageStats?.metrics[metric]?.bestMonth && 
                             pageStats.metrics[metric].bestMonth.year === item.year &&
                             pageStats.metrics[metric].bestMonth.month === item.month && (
                              <span className="text-yellow-600" title="Bästa värde för denna sida">🏆</span>
                            )}
                            {pageStats?.metrics[metric]?.worstMonth && 
                             pageStats.metrics[metric].worstMonth.year === item.year &&
                             pageStats.metrics[metric].worstMonth.month === item.month && (
                              <span className="text-gray-500" title="Sämsta värde för denna sida">📉</span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginering */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Visa:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="text-sm text-muted-foreground">
                    Visar {((currentPage - 1) * pageSize) + 1} till {Math.min(currentPage * pageSize, sortedData.length)} av {sortedData.length}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm">
                      Sida {currentPage} av {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Förklaring av ikoner */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span>🏆 = Bästa värde för denna sida</span>
                <span className="mx-4">📉 = Sämsta värde för denna sida</span>
              </div>
              <div className="text-muted-foreground text-xs">
                Gröna värden = bästa prestanda, röda värden = sämsta prestanda för vald tidsperiod
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PageTimeseriesView;