import React from 'react';

const ChartLegend = ({ chartLines }) => {
  if (!chartLines || chartLines.length === 0) {
    return null;
  }

  return (
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
  );
};

export default ChartLegend;