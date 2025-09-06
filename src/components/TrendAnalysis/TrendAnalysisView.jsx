import React from 'react';
import TrendChart from './TrendAnalysis/components/TrendChart';
import TrendStatistics from './TrendAnalysis/components/TrendStatistics';
import ChartControls from './TrendAnalysis/components/ChartControls';
import { useTrendData } from './TrendAnalysis/hooks/useTrendData';
import { useChartInteraction } from './TrendAnalysis/hooks/useChartInteraction';

// Import den faktiska modulära TrendAnalysisView
import ModularTrendAnalysisView from './TrendAnalysis/TrendAnalysisView';

/**
 * Wrapper-komponent som behåller samma API som ursprungliga TrendAnalysisView
 * men använder den nya modulära strukturen under huven.
 * 
 * Detta säkerställer att befintliga imports fortfarande fungerar:
 * import TrendAnalysisView from './components/TrendAnalysisView';
 */
const TrendAnalysisView = ({ uploadedPeriods }) => {
  return <ModularTrendAnalysisView uploadedPeriods={uploadedPeriods} />;
};

export default TrendAnalysisView;