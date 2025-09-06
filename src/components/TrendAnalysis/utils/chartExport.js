import { METRIC_DEFINITIONS } from '../../../utils/metric_categorizer';

/**
 * Exporterar SVG-chart som PNG-fil optimerad för PPT-presentationer
 * @param {Array} chartLines - Array med chart-linjer data
 * @param {string} selectedMetric - Aktuell metric som visas
 */
export const exportChartAsPNG = (chartLines, selectedMetric) => {
  const svg = document.querySelector('#trend-chart-svg');
  if (!svg || chartLines.length === 0) return;

  // Skapa en canvas för export
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Optimal PPT-storlek: 16:9 ratio, högre upplösning
  const width = 1920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;
  
  // Vit bakgrund för PPT
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Konvertera SVG till PNG via HTML5 Canvas
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL;
  const svgUrl = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.onload = () => {
    // Rita SVG på canvas med skalning för bättre kvalitet
    ctx.drawImage(img, 0, 150, width, height - 350); // Mer plats för titel och konto-info
    
    // Lägg till prominent titel
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    const title = `Utveckling över tid - ${METRIC_DEFINITIONS[selectedMetric]?.displayName}`;
    ctx.fillText(title, width / 2, 80);
    
    // Lägg till konto-information
    ctx.fillStyle = '#4b5563';
    ctx.font = '32px Arial, sans-serif';
    const selectedPageNames = chartLines.map(line => line.pageName);
    const accountText = selectedPageNames.length === 1 
      ? `Konto: ${selectedPageNames[0]}`
      : `Konton: ${selectedPageNames.join(', ')}`;
    
    // Hantera lång text genom att dela upp i rader om nödvändigt
    const maxWidth = width - 200;
    const words = accountText.split(' ');
    let line = '';
    let y = height - 80;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[n] + ' ';
        y += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);
    
    // Exportera som PNG
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Inkludera kontonamn i filnamnet
      const kontoSuffix = selectedPageNames.length === 1 
        ? selectedPageNames[0].replace(/[^a-zA-Z0-9]/g, '-')
        : `${selectedPageNames.length}-konton`;
      a.download = `trend-analys-${selectedMetric}-${kontoSuffix}-${new Date().toISOString().slice(0, 10)}.png`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
    
    URL.revokeObjectURL(svgUrl);
  };
  img.src = svgUrl;
};

/**
 * Validerar om export är möjlig
 * @param {Array} chartLines - Chart-linjer data
 * @returns {boolean} - True om export kan göras
 */
export const canExportChart = (chartLines) => {
  return chartLines && chartLines.length > 0;
};

/**
 * Genererar filnamn för export baserat på aktuell data
 * @param {string} selectedMetric - Aktuell metric
 * @param {Array} chartLines - Chart-linjer data
 * @returns {string} - Genererat filnamn
 */
export const generateExportFilename = (selectedMetric, chartLines) => {
  const selectedPageNames = chartLines.map(line => line.pageName);
  const kontoSuffix = selectedPageNames.length === 1 
    ? selectedPageNames[0].replace(/[^a-zA-Z0-9]/g, '-')
    : `${selectedPageNames.length}-konton`;
  
  const dateString = new Date().toISOString().slice(0, 10);
  return `trend-analys-${selectedMetric}-${kontoSuffix}-${dateString}.png`;
};