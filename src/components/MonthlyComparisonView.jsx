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
  BarChart3,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  Activity
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
  { value: 10, label: '10 per sida' },
  { value: 25, label: '25 per sida' },
  { value: 50, label: '50 per sida' }
];

// KORRIGERAT: Tillgängliga metrics för månadsvy
const AVAILABLE_METRICS = [
  { key: 'reach', label: 'Räckvidd', canSum: false },
  { key: 'engagements', label: 'Engagemang', canSum: true },
  { key: 'reactions', label: 'Reaktioner', canSum: true },
  { key: 'publications', label: 'Publiceringar', canSum: true }
];

// Metric-definitioner (korrigerade)
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

// DEL_1_SLUTAR_HÄR - Fortsätt med del 2 som börjar med handleExportCSV
// DEL_2_BÖRJAR_HÄR - Fortsättning från del 1 med handleExportCSV

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
      'månadsjämförelse';
      
    link.setAttribute('download', `Facebook_${periodName}.csv`);
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
          Analyserar månadsdata för Facebook-sidor...
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

  if (uploadedPeriods.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ingen data</AlertTitle>
        <AlertDescription>
          Ladda upp CSV-filer för att visa månadsvis jämförelse av Facebook-sidor.
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
            Månadsvis jämförelse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Välj månad</label>
              <Select 
                value={selectedPeriod ? `${selectedPeriod.year}_${selectedPeriod.month}` : ''}
                onValueChange={(value) => {
                  const [year, month] = value.split('_');
                  setSelectedPeriod({ year: parseInt(year), month: parseInt(month) });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj månad att analysera" />
                </SelectTrigger>
                <SelectContent>
                  {uploadedPeriods.map(period => (
                    <SelectItem key={`${period.year}_${period.month}`} value={`${period.year}_${period.month}`}>
                      {getMonthName(period.month)} {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriod && (
                <p className="text-xs text-muted-foreground mt-1">
                  Visar data för {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Metrics att visa</label>
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
                * = Kan inte summeras över sidor (unika personer per månad)
              </p>
            </div>
          </div>

          {/* Period-sammandrag */}
          {periodSummary && (
            <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-facebook-600">
                  {periodSummary.totalPages}
                </div>
                <div className="text-sm text-muted-foreground">Facebook-sidor</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {getMonthName(periodSummary.period.month)} {periodSummary.period.year}
                </div>
                <div className="text-sm text-muted-foreground">Vald period</div>
              </div>
              
              {selectedMetrics.slice(0, 2).map(metric => {
                const metricData = periodSummary.metrics[metric];
                const definition = METRIC_DEFINITIONS[metric];
                
                if (!metricData || !definition) return null;
                
                return (
                  <div key={metric} className="text-center">
                    <div className="text-lg font-semibold">
                      {definition.canSumAcrossPages ? 
                        formatValue(metricData.total) : 
                        formatValue(metricData.average)
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {definition.canSumAcrossPages ? `Total ${definition.displayName}` : `Snitt ${definition.displayName}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Månadsdata-tabell */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {selectedPeriod ? 
              `${getMonthName(selectedPeriod.month)} ${selectedPeriod.year} - Alla sidor` : 
              'Månadsdata'}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {periodData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Ingen data tillgänglig för vald månad
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('pageName')}
                    >
                      <div className="flex items-center">
                        Sidnamn
                        {getSortIcon('pageName')}
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
                    <TableRow key={item.page.pageId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ProfileIcon pageName={item.page.pageName} />
                          <span>{item.page.pageName}</span>
                        </div>
                      </TableCell>
                      {selectedMetrics.map(metric => (
                        <TableCell 
                          key={metric}
                          className="text-right"
                        >
                          <div className="flex items-center justify-end gap-1">
                            {formatValue(item.metrics[metric])}
                            {periodSummary?.metrics[metric] && 
                             item.metrics[metric] === periodSummary.metrics[metric].max && 
                             periodSummary.metrics[metric].max !== periodSummary.metrics[metric].min && (
                              <span className="text-yellow-600" title="Bästa värde för denna månad">🏆</span>
                            )}
                            {periodSummary?.metrics[metric] && 
                             item.metrics[metric] === periodSummary.metrics[metric].min && 
                             periodSummary.metrics[metric].max !== periodSummary.metrics[metric].min && (
                              <span className="text-gray-500" title="Lägsta värde för denna månad">📉</span>
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