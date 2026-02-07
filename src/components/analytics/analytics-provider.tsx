'use client';

// Analytics provider - gracefully handles missing packages
// Requires: npm install @vercel/analytics @vercel/speed-insights

export function AnalyticsProvider() {
  // These components are loaded dynamically when packages are installed
  // For now, render nothing - analytics will activate after npm install
  return null;
}
