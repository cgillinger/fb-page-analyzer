import { useState } from 'react';

export const useChartInteraction = () => {
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Hantera mouse events för tooltip
  const handleMouseMove = (event, point) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    setHoveredDataPoint(point);
  };

  const handleMouseLeave = () => {
    setHoveredDataPoint(null);
  };

  const clearHover = () => {
    setHoveredDataPoint(null);
  };

  return {
    hoveredDataPoint,
    mousePosition,
    handleMouseMove,
    handleMouseLeave,
    clearHover,
    setHoveredDataPoint,
    setMousePosition
  };
};