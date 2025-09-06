import React from 'react';
import { METRIC_DEFINITIONS } from '../../../utils/metric_categorizer';

const ChartControls = ({
  allowedMetrics,
  availablePages,
  availablePeriods,
  selectedMetric,
  selectedPages,
  selectedPeriods,
  onMetricToggle,
  onPageToggle,
  onPeriodToggle,
  onToggleAllPeriods,
  allPeriodsSelected
}) => {
  // Månadsnamn för periodvisning
  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    return months[month - 1] || month.toString();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Sidval med checkboxar */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Välj Facebook-sidor ({selectedPages.length} valda)
        </label>
        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
          {availablePages.map(page => {
            const isSelected = selectedPages.includes(page.pageId);
            
            return (
              <label key={page.pageId} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onPageToggle(page.pageId)}
                  className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
                />
                <span className="text-sm font-medium">{page.pageName}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Metric-val med radio buttons */}
      <div>
        <label className="text-sm font-medium mb-2 block">Välj datapunkt</label>
        <div className="space-y-2">
          {allowedMetrics.map(metric => (
            <label key={metric.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="selectedMetric"
                value={metric.key}
                checked={selectedMetric === metric.key}
                onChange={() => onMetricToggle(metric.key)}
                className="h-4 w-4 text-facebook-500 border-gray-300 focus:ring-facebook-500"
              />
              <span className="text-sm font-medium">
                {metric.label}
                {!metric.canSum && (
                  <span className="text-xs text-red-600 ml-1">(genomsnitt/månad)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Periodval med checkboxar */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Välj perioder ({selectedPeriods.length} valda)
        </label>
        
        {/* Välj alla-knapp */}
        <label className="flex items-center gap-2 cursor-pointer mb-2 pb-2 border-b">
          <input
            type="checkbox"
            checked={allPeriodsSelected}
            onChange={onToggleAllPeriods}
            className="h-4 w-4 text-facebook-500 border-gray-300 rounded focus:ring-facebook-500"
          />
          <span className="text-sm font-medium">Välj alla perioder</span>
        </label>

        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
          {availablePeriods.map(period => {
            const isSelected = selectedPeriods.some(p => 
              p.year === period.year && p.month === period.month
            );
            
            return (
              <label key={`${period.year}-${period.month}`} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onPeriodToggle(period)}
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
  );
};

export default ChartControls;