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

// Sidstorlekar för paginering
const PAGE_SIZE_OPTIONS = [
  { value: 6, label: '6 per sida' },
  { value: 12, label: '12 per sida' },
  { value: 24, label: '24 per sida' }
];

// KORRIGERAT: Tillgängliga metrics (utan Status & Kommentarer)
const AVAILABLE_METRICS = [
  { key: 'reach', label: 'Räckvidd', canSum: false },
  { key: 'engagements', label: 'Engagemang', canSum: true },
  { key: 'reactions', label: 'Reaktioner', canSum: true },
  { key: 'publications', label: 'Publiceringar', canSum: true }
];

// Metric-definitioner (korrigerade - utan Status & Kommentarer)
const METRIC_DEFINITIONS = {
  reach: { displayName: 'Räckvidd', canSumAcrossPages: false, category: 'unique_persons' },
  engagements: { displayName: 'Engagemang', canSumAcrossPages: true, category: 'countable' },
  reactions: { displayName: 'Reaktioner', canSumAcrossPages: true, category: 'countable' },
  publications: { displayName: 'Publiceringar', canSumAcrossPages: true, category: 'countable' }
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
                  publications: parseNumericValue(pageRow.Publications || pageRow.publications)
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
    
    const pageName = selectedPage?.pageName.replace(/[^a-zA-Z0-9]/g, '_') || 'sida';
    link.setAttribute('download', `facebook_tidserie_${pageName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Få trend-ikon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Återställ pagination när pageSize ändras
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, selectedPageId, selectedMetrics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-facebook-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Laddar siddata...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel vid laddning av data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (uploadedPeriods.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ingen data tillgänglig</AlertTitle>
        <AlertDescription>
          Ladda upp Facebook CSV-filer för att visa sidanalys över tid.
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
                      {page.pageName}
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
                      <span className="text-sm font-medium text-gray-700">
                        {metric.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik-sammandrag */}
      {pageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-facebook-500" />
              Prestanda-sammandrag för {pageStats.pageName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="font-bold text-lg text-facebook-600">{pageStats.totalPeriods}</div>
                <div className="text-sm text-muted-foreground">Månader med data</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Första månad</div>
                <div className="font-medium">
                  {pageStats.firstPeriod ? `${getMonthName(pageStats.firstPeriod.month)} ${pageStats.firstPeriod.year}` : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Senaste månad</div>
                <div className="font-medium">
                  {pageStats.lastPeriod ? `${getMonthName(pageStats.lastPeriod.month)} ${pageStats.lastPeriod.year}` : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Dataperiod</div>
                <div className="font-medium">
                  {pageStats.totalPeriods > 1 ? `${pageStats.totalPeriods} månader` : 'En månad'}
                </div>
              </div>
            </div>

            {/* Trend-analys för valda metrics */}
            {Object.keys(trendAnalysis).length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Utvecklingstrend (första vs senaste månaden)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedMetrics.slice(0, 3).map(metric => {
                    const trend = trendAnalysis[metric];
                    const definition = METRIC_DEFINITIONS[metric];
                    
                    if (!trend || !definition) return null;
                    
                    return (
                      <div key={metric} className="flex items-center justify-between p-3 rounded border">
                        <div>
                          <div className="font-medium text-sm">{definition.displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {trend.change > 0 ? '+' : ''}{trend.change.toLocaleString()} 
                            ({trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%)
                          </div>
                        </div>
                        {getTrendIcon(trend.trend)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Huvud-tabell */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-facebook-500" />
              Månadsutveckling ({sortedData.length} månader)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <FileDown className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExportCSV()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
                    onClick={() => handleSort('year_month')}
                  >
                    <div className="flex items-center">
                      Period {getSortIcon('year_month')}
                    </div>
                  </TableHead>
                  
                  {selectedMetrics.map(metric => {
                    const definition = METRIC_DEFINITIONS[metric];
                    return (
                      <TableHead 
                        key={metric}
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort(metric)}
                      >
                        <div className="flex items-center justify-end">
                          {definition ? definition.displayName : metric}
                          {getSortIcon(metric)}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => (
                  <TableRow key={`${item.year}-${item.month}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{getMonthName(item.month)} {item.year}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.year}-{String(item.month).padStart(2, '0')}
                        </div>
                      </div>
                    </TableCell>
                    
                    {selectedMetrics.map(metric => {
                      const value = item.metrics[metric] || 0;
                      const definition = METRIC_DEFINITIONS[metric];
                      
                      // Kontrollera om detta är bästa eller sämsta värdet för denna metric
                      const metricStats = pageStats?.metrics[metric];
                      const isBest = metricStats && value === metricStats.max;
                      const isWorst = metricStats && value === metricStats.min && metricStats.min !== metricStats.max;
                      
                      return (
                        <TableCell key={metric} className="text-right">
                          <div className={`font-mono ${isBest ? 'text-green-600 font-bold' : isWorst ? 'text-red-600' : ''}`}>
                            {typeof value === 'number' ? value.toLocaleString() : value}
                            {isBest && <span className="ml-1 text-xs">🏆</span>}
                            {isWorst && <span className="ml-1 text-xs">📉</span>}
                          </div>
                          {definition && definition.category === 'unique_persons' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Unika
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginering */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visa</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[140px]">
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