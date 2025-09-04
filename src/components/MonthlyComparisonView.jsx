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
  Calendar, 
  Users,
  TrendingUp,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Sidstorlekar för paginering
const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 per sida' },
  { value: 25, label: '25 per sida' },
  { value: 50, label: '50 per sida' },
  { value: 100, label: '100 per sida' }
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

function MonthlyComparisonView({ uploadedPeriods = [] }) {
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodData, setPeriodData] = useState([]);
  const [periodSummary, setPeriodSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tabell-state
  const [sortConfig, setSortConfig] = useState({ key: 'pageName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedMetrics, setSelectedMetrics] = useState(['reach', 'engagements', 'publications']);

  // Sätt default period när uploadedPeriods ändras
  useEffect(() => {
    if (uploadedPeriods.length > 0 && !selectedPeriod) {
      const firstPeriod = uploadedPeriods[0];
      setSelectedPeriod({ year: firstPeriod.year, month: firstPeriod.month });
    }
  }, [uploadedPeriods, selectedPeriod]);

  // Ladda data när vald period ändras
  useEffect(() => {
    if (!selectedPeriod) return;
    
    const loadPeriodData = () => {
      try {
        setLoading(true);
        setError(null);
        
        const matchingPeriod = uploadedPeriods.find(period => 
          period.year === selectedPeriod.year && period.month === selectedPeriod.month
        );
        
        if (!matchingPeriod) {
          setError(`Ingen data hittades för ${getMonthName(selectedPeriod.month)} ${selectedPeriod.year}`);
          setPeriodData([]);
          setPeriodSummary(null);
          return;
        }
        
        // KORRIGERAT: Mappa endast de 4 relevanta kolumnerna från CSV
        const convertedData = matchingPeriod.data.map(csvRow => ({
          page: {
            pageName: csvRow.Page || csvRow.page || 'Okänd sida',
            pageId: csvRow['Page ID'] || csvRow.pageId || 'unknown'
          },
          period: {
            year: selectedPeriod.year,
            month: selectedPeriod.month
          },
          metrics: {
            reach: parseNumericValue(csvRow.Reach || csvRow.reach),
            engagements: parseNumericValue(csvRow.Engagements || csvRow.engagements),
            reactions: parseNumericValue(csvRow.Reactions || csvRow.reactions),
            publications: parseNumericValue(csvRow.Publications || csvRow.publications)
          }
        }));
        
        setPeriodData(convertedData);
        
        const summary = calculatePeriodSummary(convertedData, selectedPeriod.year, selectedPeriod.month);
        setPeriodSummary(summary);
        
      } catch (err) {
        console.error('Error loading period data:', err);
        setError(`Kunde inte ladda data för ${getMonthName(selectedPeriod.month)} ${selectedPeriod.year}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadPeriodData();
  }, [selectedPeriod, uploadedPeriods]);

  // Parse numeriskt värde säkert
  const parseNumericValue = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/[,\s]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Hjälpfunktion för månadsnamn
  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    return months[month - 1];
  };

  // Beräkna period-sammandrag (KORRIGERAT)
  const calculatePeriodSummary = (data, year, month) => {
    if (!data.length) return null;
    
    const summary = {
      period: { year, month },
      totalPages: data.length,
      metrics: {}
    };

    // KORRIGERAT: Använd bara de 4 relevanta metrics
    const availableMetricKeys = ['reach', 'engagements', 'reactions', 'publications'];
    
    for (const metric of availableMetricKeys) {
      const values = data
        .map(item => item.metrics[metric])
        .filter(value => value !== null && value !== undefined && !isNaN(value) && value >= 0);

      if (values.length === 0) {
        summary.metrics[metric] = {
          total: 0,
          average: 0,
          min: 0,
          max: 0,
          validPages: 0,
          type: METRIC_DEFINITIONS[metric].category
        };
        continue;
      }

      const definition = METRIC_DEFINITIONS[metric];
      
      if (!definition.canSumAcrossPages) {
        summary.metrics[metric] = {
          average: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          validPages: values.length,
          type: 'unique_persons',
          note: 'Genomsnitt över sidor - total reach kan inte beräknas'
        };
      } else {
        const total = values.reduce((sum, val) => sum + val, 0);
        summary.metrics[metric] = {
          total,
          average: Math.round(total / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          validPages: values.length,
          type: 'countable'
        };
      }
    }

    return summary;
  };

  // Sortera data
  const sortedData = useMemo(() => {
    if (!periodData.length) return [];
    
    return [...periodData].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'pageName') {
        aValue = a.page.pageName;
        bValue = b.page.pageName;
      } else {
        aValue = a.metrics[sortConfig.key] || 0;
        bValue = b.metrics[sortConfig.key] || 0;
      }
      
      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      const comparison = aValue - bValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [periodData, sortConfig]);

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
    const headers = ['Sidnamn', 'Sido-ID', ...selectedMetrics.map(m => {
      const def = METRIC_DEFINITIONS[m];
      return def ? def.displayName : m;
    })];
    
    const csvData = sortedData.map(item => [
      item.page.pageName,
      item.page.pageId,
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
    
    const periodName = selectedPeriod ? 
      `${getMonthName(selectedPeriod.month)}_${selectedPeriod.year}` : 
      'månadsanalys';
      
    link.setAttribute('download', `facebook_månadsanalys_${periodName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Återställ pagination när pageSize ändras
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, selectedPeriod, selectedMetrics]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-facebook-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Laddar månadsdata...</p>
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
          Ladda upp Facebook CSV-filer för att visa månadsanalys.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period-väljare och kontroller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-facebook-500" />
            Månadsanalys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Välj månad</label>
              <Select 
                value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                onValueChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  setSelectedPeriod({ year, month });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj månad att analysera" />
                </SelectTrigger>
                <SelectContent>
                  {uploadedPeriods.map(period => (
                    <SelectItem 
                      key={`${period.year}-${period.month}`} 
                      value={`${period.year}-${period.month}`}
                    >
                      {getMonthName(period.month)} {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          
          {/* Period-sammandrag */}
          {periodSummary && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sammandrag för {selectedPeriod ? `${getMonthName(selectedPeriod.month)} ${selectedPeriod.year}` : ''}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-facebook-600">{periodSummary.totalPages}</div>
                  <div className="text-muted-foreground">Facebook-sidor</div>
                </div>
                {selectedMetrics.slice(0, 3).map(metric => {
                  const summary = periodSummary.metrics[metric];
                  const definition = METRIC_DEFINITIONS[metric];
                  
                  if (!summary || !definition) return null;
                  
                  const value = definition.canSumAcrossPages ? summary.total : summary.average;
                  const label = definition.canSumAcrossPages ? 'Totalt' : 'Genomsnitt';
                  
                  return (
                    <div key={metric} className="text-center">
                      <div className="font-bold text-lg text-facebook-600">
                        {value ? value.toLocaleString() : 0}
                      </div>
                      <div className="text-muted-foreground">
                        {label} {definition.displayName.toLowerCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Huvud-tabell */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-facebook-500" />
              Facebook-sidor ({sortedData.length})
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
                    className="cursor-pointer hover:bg-muted/50 min-w-[200px]"
                    onClick={() => handleSort('pageName')}
                  >
                    <div className="flex items-center">
                      Sidnamn {getSortIcon('pageName')}
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
                  <TableRow key={item.page.pageId || index}>
                    <TableCell className="font-medium">
                      <div className="min-w-0">
                        <div className="truncate" title={item.page.pageName}>
                          {item.page.pageName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {item.page.pageId}
                        </div>
                      </div>
                    </TableCell>
                    
                    {selectedMetrics.map(metric => {
                      const value = item.metrics[metric] || 0;
                      const definition = METRIC_DEFINITIONS[metric];
                      
                      return (
                        <TableCell key={metric} className="text-right">
                          <div className="font-mono">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </div>
                          {definition && definition.category === 'unique_persons' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Unika personer
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
          
          {/* Varning för icke-summerbara metrics */}
          {selectedMetrics.some(m => METRIC_DEFINITIONS[m]?.category === 'unique_persons') && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Viktigt om Räckvidd</AlertTitle>
              <AlertDescription className="text-amber-700">
                Räckvidd representerar unika personer per månad och kan ALDRIG summeras över månader eller sidor. 
                Värdena i tabellen visar data för den valda månaden.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MonthlyComparisonView;