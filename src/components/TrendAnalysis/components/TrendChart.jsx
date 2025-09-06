import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { LineChart } from 'lucide-react';
import ChartLegend from './ChartLegend';
import { createSmoothPath } from '../utils/chartCalculations';
import { exportChartAsPNG } from '../utils/chartExport';
import { METRIC_DEFINITIONS } from '../../../utils/metric_categorizer';

const TrendChart = ({ 
  chartLines, 
  yAxisRange, 
  availablePeriods, 
  selectedMetric,
  chartInteraction 
}) => {
  const { hoveredDataPoint, mousePosition, handleMouseMove } = chartInteraction;

  // Månadsnamn för X-axel
  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    return months[month - 1] || month.toString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5" />
          Utveckling över tid
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportChartAsPNG(chartLines, selectedMetric)} 
            variant="outline" 
            size="sm" 
            disabled={chartLines.length === 0}
          >
            📊 Exportera PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartLines.length > 0 ? (
          <div className="space-y-4">
            {/* Legenda */}
            <ChartLegend chartLines={chartLines} />

            {/* SVG Diagram */}
            <div className="relative">
              <svg 
                id="trend-chart-svg"
                width="100%" 
                height="500" 
                viewBox="0 0 1000 500"
                className="border rounded bg-gray-50"
                onMouseLeave={() => chartInteraction.setHoveredDataPoint(null)}
              >
                {/* Grid-linjer */}
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Y-axel värden */}
                {[0, 25, 50, 75, 100].map(percent => {
                  const yPos = 450 - (percent / 100) * 380;
                  const value = yAxisRange.min + (percent / 100) * (yAxisRange.max - yAxisRange.min);
                  return (
                    <g key={percent}>
                      <line x1="70" y1={yPos} x2="930" y2={yPos} stroke="#d1d5db" strokeWidth="1"/>
                      <text x="65" y={yPos + 4} textAnchor="end" fontSize="14" fill="#6b7280">
                        {Math.round(value).toLocaleString()}
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

                {/* Mjuka kurvor och punkter */}
                {chartLines.map(line => {
                  if (line.points.length < 1) return null;

                  // Beräkna koordinater för alla punkter
                  const pathPoints = line.points.map((point, index) => {
                    const periodIndex = availablePeriods.findIndex(p => 
                      `${p.year}-${p.month.toString().padStart(2, '0')}` === point.periodKey
                    );
                    const x = 70 + (periodIndex / Math.max(1, availablePeriods.length - 1)) * 860;
                    const y = 450 - ((point.value - yAxisRange.min) / (yAxisRange.max - yAxisRange.min)) * 380;
                    
                    return { x, y, point };
                  });

                  return (
                    <g key={line.pageId}>
                      {/* Mjuk kurva */}
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
                          onMouseLeave={() => chartInteraction.setHoveredDataPoint(null)}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Tooltip */}
                {hoveredDataPoint && (
                  <g>
                    {(() => {
                      const tooltipWidth = 200;
                      const tooltipHeight = 70;
                      let tooltipX = mousePosition.x + 15;
                      let tooltipY = mousePosition.y - 35;
                      
                      // Justera position för att hålla tooltip inom SVG
                      if (tooltipX + tooltipWidth > 980) {
                        tooltipX = mousePosition.x - tooltipWidth - 15;
                      }
                      if (tooltipY < 15) {
                        tooltipY = mousePosition.y + 15;
                      }
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
              Markera minst en Facebook-sida och period för att visa utvecklingen över tid
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendChart;