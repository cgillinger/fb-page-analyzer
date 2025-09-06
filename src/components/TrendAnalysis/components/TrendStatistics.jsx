import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateMonthToMonthTrend, calculateAverageTrend } from '../../../services/timeseries_analytics';
import { METRIC_DEFINITIONS } from '../../../utils/metric_categorizer';

const TrendStatistics = ({ 
  dataset, 
  availablePages, 
  selectedMetric, 
  showDetailedTrends, 
  onToggleDetails 
}) => {
  // Beräkna trendstatistik för alla sidor
  const trendStatistics = useMemo(() => {
    if (!dataset) return [];

    const stats = [];
    
    availablePages.forEach(page => {
      const timeseries = dataset.getPageTimeseries(page.pageId);
      if (!timeseries) return;

      const trendData = calculateMonthToMonthTrend(timeseries, selectedMetric);
      const avgTrend = calculateAverageTrend(trendData);
      
      if (trendData.length > 0) {
        stats.push({
          page,
          trendData,
          avgTrend,
          totalPeriods: trendData.length + 1,
          latestChange: trendData[trendData.length - 1]
        });
      }
    });

    return stats.sort((a, b) => b.avgTrend.averagePercentageChange - a.avgTrend.averagePercentageChange);
  }, [dataset, availablePages, selectedMetric]);

  // Top 5 och Bottom 5 för snabb översikt
  const topPerformers = trendStatistics.slice(0, 5);
  const bottomPerformers = trendStatistics.slice(-5).reverse();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Trendstatistik - {METRIC_DEFINITIONS[selectedMetric]?.displayName}
        </CardTitle>
        <Button
          variant="outline"
          onClick={onToggleDetails}
        >
          {showDetailedTrends ? 'Dölj detaljer' : 'Visa detaljer'}
        </Button>
      </CardHeader>
      <CardContent>
        {trendStatistics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingen trenddata tillgänglig för den valda metriken.</p>
            <p className="text-sm mt-2">Ladda upp minst två månaders data för att se trends.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Snabb översikt - Top/Bottom performers */}
            {!showDetailedTrends && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top 5 Performers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-5 w-5" />
                    Bäst utveckling
                  </h3>
                  <div className="space-y-3">
                    {topPerformers.map((stat, index) => (
                      <div key={stat.page.pageId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium">{stat.page.pageName}</div>
                          <div className="text-sm text-muted-foreground">
                            {stat.avgTrend.positiveMonths}↗ {stat.avgTrend.negativeMonths}↘ {stat.avgTrend.stableMonths}→
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-700">
                            +{stat.avgTrend.averagePercentageChange.toFixed(1)}%
                          </div>
                          <div className="text-xs text-green-600">
                            genomsnitt/månad
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom 5 Performers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-5 w-5" />
                    Sämst utveckling
                  </h3>
                  <div className="space-y-3">
                    {bottomPerformers.map((stat, index) => (
                      <div key={stat.page.pageId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium">{stat.page.pageName}</div>
                          <div className="text-sm text-muted-foreground">
                            {stat.avgTrend.positiveMonths}↗ {stat.avgTrend.negativeMonths}↘ {stat.avgTrend.stableMonths}→
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-700">
                            {stat.avgTrend.averagePercentageChange.toFixed(1)}%
                          </div>
                          <div className="text-xs text-red-600">
                            genomsnitt/månad
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Detaljerad trendtabell */}
            {showDetailedTrends && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 font-medium">
                  Detaljerad trendanalys för alla sidor
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {trendStatistics.map(stat => (
                    <div key={stat.page.pageId} className="p-3 border-b last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{stat.page.pageName}</div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            stat.avgTrend.averagePercentageChange > 0 
                              ? 'bg-green-100 text-green-800'
                              : stat.avgTrend.averagePercentageChange < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {stat.avgTrend.averagePercentageChange > 0 ? '+' : ''}
                            {stat.avgTrend.averagePercentageChange.toFixed(1)}% snitt
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {stat.avgTrend.positiveMonths}↗ {stat.avgTrend.negativeMonths}↘ {stat.avgTrend.stableMonths}→
                          </span>
                        </div>
                      </div>
                      
                      {stat.latestChange && (
                        <div className="text-sm text-muted-foreground">
                          Senaste förändring: {stat.latestChange.previousPeriod} → {stat.latestChange.period}
                          <span className={`ml-2 font-medium ${
                            stat.latestChange.percentageChange > 0 ? 'text-green-600' : 
                            stat.latestChange.percentageChange < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {stat.latestChange.percentageChange > 0 ? '+' : ''}
                            {stat.latestChange.percentageChange?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendStatistics;