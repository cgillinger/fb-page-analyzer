import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Calendar, Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

const PeriodSelector = ({ 
  uploadedPeriods = [], 
  selectedPeriods = [], 
  onPeriodsChange,
  title = "Välj tidsperioder",
  showStatistics = true,
  compact = false
}) => {
  // State för snabbval
  const [quickSelectActive, setQuickSelectActive] = useState(null);

  // Sortera perioder kronologiskt
  const sortedPeriods = useMemo(() => {
    return uploadedPeriods
      .map(period => ({
        ...period,
        sortKey: period.year * 100 + period.month,
        displayName: getMonthName(period.month) + ' ' + period.year
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [uploadedPeriods]);

  // Gruppera perioder per år
  const periodsByYear = useMemo(() => {
    const grouped = new Map();
    
    sortedPeriods.forEach(period => {
      if (!grouped.has(period.year)) {
        grouped.set(period.year, []);
      }
      grouped.get(period.year).push(period);
    });

    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]); // Senaste år först
  }, [sortedPeriods]);

  // Månadsnamn
  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    return months[month - 1] || month.toString();
  };

  // Kontrollera om period är vald
  const isPeriodSelected = (period) => {
    return selectedPeriods.some(p => 
      p.year === period.year && p.month === period.month
    );
  };

  // Hantera enskild period-toggle
  const handlePeriodToggle = (period) => {
    const isSelected = isPeriodSelected(period);
    
    let newSelection;
    if (isSelected) {
      newSelection = selectedPeriods.filter(p => 
        !(p.year === period.year && p.month === period.month)
      );
    } else {
      newSelection = [...selectedPeriods, period];
    }
    
    onPeriodsChange?.(newSelection);
    setQuickSelectActive(null); // Rensa snabbval när användaren gör manuella val
  };

  // Hantera årval (alla månader i ett år)
  const handleYearToggle = (year) => {
    const yearPeriods = periodsByYear.find(([y]) => y === year)?.[1] || [];
    const allYearSelected = yearPeriods.every(period => isPeriodSelected(period));
    
    let newSelection;
    if (allYearSelected) {
      // Ta bort alla månader från detta år
      newSelection = selectedPeriods.filter(p => p.year !== year);
    } else {
      // Lägg till alla månader från detta år (som inte redan är valda)
      const periodsToAdd = yearPeriods.filter(period => !isPeriodSelected(period));
      newSelection = [...selectedPeriods, ...periodsToAdd];
    }
    
    onPeriodsChange?.(newSelection);
    setQuickSelectActive(null);
  };

  // Snabbval-funktioner
  const handleSelectAll = () => {
    onPeriodsChange?.(sortedPeriods);
    setQuickSelectActive('all');
  };

  const handleSelectNone = () => {
    onPeriodsChange?.([]);
    setQuickSelectActive('none');
  };

  const handleSelectLast6Months = () => {
    const last6 = sortedPeriods.slice(-6);
    onPeriodsChange?.(last6);
    setQuickSelectActive('last6');
  };

  const handleSelectLastYear = () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const lastYearPeriods = sortedPeriods.filter(p => p.year === lastYear);
    onPeriodsChange?.(lastYearPeriods);
    setQuickSelectActive('lastYear');
  };

  const handleSelectCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    const currentYearPeriods = sortedPeriods.filter(p => p.year === currentYear);
    onPeriodsChange?.(currentYearPeriods);
    setQuickSelectActive('currentYear');
  };

  // Beräkna statistik för valda perioder
  const selectionStats = useMemo(() => {
    if (selectedPeriods.length === 0) {
      return {
        totalPeriods: 0,
        years: [],
        dateRange: null,
        totalPages: 0
      };
    }

    const sortedSelected = selectedPeriods
      .map(p => ({ ...p, sortKey: p.year * 100 + p.month }))
      .sort((a, b) => a.sortKey - b.sortKey);

    const years = [...new Set(selectedPeriods.map(p => p.year))].sort();
    const firstPeriod = sortedSelected[0];
    const lastPeriod = sortedSelected[sortedSelected.length - 1];
    
    const totalPages = selectedPeriods.reduce((sum, period) => sum + (period.pageCount || 0), 0);

    return {
      totalPeriods: selectedPeriods.length,
      years,
      dateRange: selectedPeriods.length === 1 
        ? `${getMonthName(firstPeriod.month)} ${firstPeriod.year}`
        : `${getMonthName(firstPeriod.month)} ${firstPeriod.year} - ${getMonthName(lastPeriod.month)} ${lastPeriod.year}`,
      totalPages
    };
  }, [selectedPeriods]);

  // Kontrollera årval-status
  const getYearSelectionStatus = (year) => {
    const yearPeriods = periodsByYear.find(([y]) => y === year)?.[1] || [];
    const selectedCount = yearPeriods.filter(period => isPeriodSelected(period)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === yearPeriods.length) return 'all';
    return 'partial';
  };

  if (uploadedPeriods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inga perioder tillgängliga. Ladda upp CSV-filer först.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Snabbval-knappar */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quickSelectActive === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={handleSelectAll}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Alla
          </Button>
          <Button
            variant={quickSelectActive === 'none' ? 'default' : 'outline'}
            size="sm"
            onClick={handleSelectNone}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Ingen
          </Button>
          <Button
            variant={quickSelectActive === 'last6' ? 'default' : 'outline'}
            size="sm"
            onClick={handleSelectLast6Months}
            disabled={sortedPeriods.length < 6}
          >
            <Clock className="h-3 w-3 mr-1" />
            Senaste 6 månader
          </Button>
          <Button
            variant={quickSelectActive === 'currentYear' ? 'default' : 'outline'}
            size="sm"
            onClick={handleSelectCurrentYear}
            disabled={!periodsByYear.some(([year]) => year === new Date().getFullYear())}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Innevarande år
          </Button>
          <Button
            variant={quickSelectActive === 'lastYear' ? 'default' : 'outline'}
            size="sm"
            onClick={handleSelectLastYear}
            disabled={!periodsByYear.some(([year]) => year === new Date().getFullYear() - 1)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Föregående år
          </Button>
        </div>

        {/* Statistik för vald selection */}
        {showStatistics && selectedPeriods.length > 0 && (
          <div className="p-3 bg-facebook-50 rounded-lg border border-facebook-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="font-medium text-facebook-900">{selectionStats.totalPeriods}</div>
                <div className="text-facebook-700">valda månader</div>
              </div>
              <div>
                <div className="font-medium text-facebook-900">{selectionStats.years.length}</div>
                <div className="text-facebook-700">år ({selectionStats.years.join(', ')})</div>
              </div>
              <div className="md:col-span-2">
                <div className="font-medium text-facebook-900">{selectionStats.dateRange}</div>
                <div className="text-facebook-700">tidsperiod</div>
              </div>
            </div>
          </div>
        )}

        {/* Period-väljare grupperade per år */}
        <div className="space-y-4">
          {periodsByYear.map(([year, yearPeriods]) => {
            const yearStatus = getYearSelectionStatus(year);
            
            return (
              <div key={year} className="border rounded-lg p-3">
                {/* År-header med årval */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`year-${year}`}
                      checked={yearStatus === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = yearStatus === 'partial';
                      }}
                      onCheckedChange={() => handleYearToggle(year)}
                    />
                    <Label 
                      htmlFor={`year-${year}`}
                      className="text-lg font-medium cursor-pointer"
                    >
                      {year}
                    </Label>
                    <Badge variant="secondary">
                      {yearPeriods.filter(p => isPeriodSelected(p)).length}/{yearPeriods.length} månader
                    </Badge>
                  </div>
                </div>

                {/* Månader för detta år */}
                <div className={`grid gap-2 ${compact ? 'grid-cols-4 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                  {yearPeriods.map(period => (
                    <div key={`${period.year}-${period.month}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`period-${period.year}-${period.month}`}
                        checked={isPeriodSelected(period)}
                        onCheckedChange={() => handlePeriodToggle(period)}
                      />
                      <Label 
                        htmlFor={`period-${period.year}-${period.month}`}
                        className={`cursor-pointer ${compact ? 'text-sm' : 'text-sm font-normal'}`}
                      >
                        {compact ? getMonthName(period.month).slice(0, 3) : getMonthName(period.month)}
                        {period.pageCount && !compact && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({period.pageCount} sidor)
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summering */}
        <div className="text-sm text-muted-foreground border-t pt-3">
          {selectedPeriods.length === 0 ? (
            "Inga perioder valda"
          ) : selectedPeriods.length === uploadedPeriods.length ? (
            `Alla ${uploadedPeriods.length} tillgängliga perioder valda`
          ) : (
            `${selectedPeriods.length} av ${uploadedPeriods.length} perioder valda`
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodSelector;