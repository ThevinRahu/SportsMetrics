/**
 * SportsMetrics Design System
 * Dark theme optimized for data-heavy dashboards
 */

export const theme = {
  // Base colors
  bg: "#0a0e1a",
  surface: "#111827",
  card: "#1a2236",
  border: "#1e2d45",
  borderLight: "#253352",
  
  // Accent colors
  green: "#10b981",
  greenDark: "#064e3b",
  greenText: "#34d399",
  amber: "#f59e0b",
  amberDark: "#451a03",
  amberText: "#fbbf24",
  red: "#ef4444",
  redDark: "#450a0a",
  redText: "#f87171",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  
  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textDim: "#475569",
  
  // Gradients
  gradientPrimary: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  gradientDanger: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  gradientPurple: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  
  // Shadows
  shadow: "0 4px 24px rgba(0,0,0,0.3)",
  shadowSm: "0 2px 8px rgba(0,0,0,0.2)",
  
  // Border radius
  radius: "12px",
  radiusSm: "8px",
  radiusXs: "4px",
};

// Utility functions
export function ratingColor(value) {
  if (value >= 80) return theme.green;
  if (value >= 60) return theme.amber;
  return theme.red;
}

export function ratingBg(value) {
  if (value >= 80) return theme.greenDark;
  if (value >= 60) return theme.amberDark;
  return theme.redDark;
}

export function injuryColor(status) {
  if (status === "Low") return theme.green;
  if (status === "Medium") return theme.amber;
  return theme.red;
}

export function winColor(prob) {
  if (prob > 60) return theme.green;
  if (prob > 45) return theme.amber;
  return theme.red;
}

export default theme;
