/**
 * Skapar mjuka kurvor för SVG-path med Catmull-Rom spline teknik
 * @param {Array} points - Array med {x, y, point} objekt
 * @returns {string} - SVG path string för mjuk kurva
 */
export const createSmoothPath = (points) => {
  if (points.length < 2) return '';
  
  // För få punkter för mjuk kurva, använd vanlig linje
  if (points.length === 2) {
    const [p1, p2] = points;
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }
  
  // Skapa mjuk kurva med quadratic Bézier curves
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const previous = points[i - 1];
    
    if (i === 1) {
      // Första kurvan
      const next = points[i + 1] || current;
      const cp1x = previous.x + (current.x - previous.x) * 0.3;
      const cp1y = previous.y + (current.y - previous.y) * 0.3;
      const cp2x = current.x - (next.x - previous.x) * 0.1;
      const cp2y = current.y - (next.y - previous.y) * 0.1;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
    } else if (i === points.length - 1) {
      // Sista kurvan
      const beforePrev = points[i - 2] || previous;
      const cp1x = previous.x + (current.x - beforePrev.x) * 0.1;
      const cp1y = previous.y + (current.y - beforePrev.y) * 0.1;
      const cp2x = current.x - (current.x - previous.x) * 0.3;
      const cp2y = current.y - (current.y - previous.y) * 0.3;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
    } else {
      // Mellanliggande kurvor
      const next = points[i + 1];
      const beforePrev = points[i - 2] || previous;
      const cp1x = previous.x + (current.x - beforePrev.x) * 0.1;
      const cp1y = previous.y + (current.y - beforePrev.y) * 0.1;
      const cp2x = current.x - (next.x - previous.x) * 0.1;
      const cp2y = current.y - (next.y - previous.y) * 0.1;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${current.x} ${current.y}`;
    }
  }
  
  return path;
};

/**
 * Beräknar optimal position för tooltip inom SVG-området
 * @param {Object} mousePos - { x, y } musposition
 * @param {Object} tooltipSize - { width, height } tooltip-storlek
 * @param {Object} svgSize - { width, height } SVG-storlek
 * @returns {Object} - Justerad tooltip-position
 */
export const calculateTooltipPosition = (mousePos, tooltipSize, svgSize) => {
  let tooltipX = mousePos.x + 15;
  let tooltipY = mousePos.y - 35;
  
  // Justera om tooltip går utanför höger kant
  if (tooltipX + tooltipSize.width > svgSize.width - 20) {
    tooltipX = mousePos.x - tooltipSize.width - 15;
  }
  
  // Justera om tooltip går utanför övre kant
  if (tooltipY < 15) {
    tooltipY = mousePos.y + 15;
  }
  
  // Justera om tooltip går utanför nedre kant
  if (tooltipY + tooltipSize.height > svgSize.height - 20) {
    tooltipY = mousePos.y - tooltipSize.height - 15;
  }
  
  return { x: tooltipX, y: tooltipY };
};

/**
 * Konverterar data-värde till SVG Y-koordinat
 * @param {number} value - Data-värde
 * @param {Object} yAxisRange - { min, max } för Y-axeln
 * @param {number} chartHeight - Höjd på chart-området
 * @param {number} chartTop - Y-offset för chart-början
 * @returns {number} - SVG Y-koordinat
 */
export const valueToSVGY = (value, yAxisRange, chartHeight, chartTop) => {
  const normalizedValue = (value - yAxisRange.min) / (yAxisRange.max - yAxisRange.min);
  return chartTop + chartHeight - (normalizedValue * chartHeight);
};

/**
 * Konverterar period-index till SVG X-koordinat
 * @param {number} periodIndex - Index för perioden
 * @param {number} totalPeriods - Totalt antal perioder
 * @param {number} chartWidth - Bredd på chart-området
 * @param {number} chartLeft - X-offset för chart-början
 * @returns {number} - SVG X-koordinat
 */
export const periodToSVGX = (periodIndex, totalPeriods, chartWidth, chartLeft) => {
  if (totalPeriods <= 1) return chartLeft + chartWidth / 2;
  return chartLeft + (periodIndex / (totalPeriods - 1)) * chartWidth;
};

/**
 * Genererar Y-axel grid-linjer och etiketter
 * @param {Object} yAxisRange - { min, max } för Y-axeln
 * @param {number} steps - Antal grid-linjer (default 5)
 * @returns {Array} - Array med grid-line data
 */
export const generateYAxisGrid = (yAxisRange, steps = 5) => {
  const gridLines = [];
  
  for (let i = 0; i <= steps; i++) {
    const percent = i / steps;
    const value = yAxisRange.min + percent * (yAxisRange.max - yAxisRange.min);
    
    gridLines.push({
      percent,
      value: Math.round(value),
      label: Math.round(value).toLocaleString()
    });
  }
  
  return gridLines;
};