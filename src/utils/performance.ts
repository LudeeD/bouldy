import { invoke } from "@tauri-apps/api/core";

/**
 * Startup Performance Monitoring
 * Tracks key milestones in app initialization and sends metrics to Tauri backend + console
 */

interface PerformanceMetrics {
  themeInitStart: number;
  themeInitEnd?: number;
  reactMountStart: number;
  reactMountEnd?: number;
  firstPaintTime?: number;
}

const metrics: PerformanceMetrics = {
  themeInitStart: performance.now(),
  reactMountStart: 0,
};

/**
 * Mark the end of theme initialization
 */
export function markThemeInitEnd() {
  metrics.themeInitEnd = performance.now();
}

/**
 * Mark the start of React mounting
 */
export function markReactMountStart() {
  metrics.reactMountStart = performance.now();
}

/**
 * Mark the end of React mounting and calculate timings
 */
export function markReactMountEnd() {
  metrics.reactMountEnd = performance.now();
  reportStartupMetrics();
}

/**
 * Get current metrics object
 */
export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Report startup metrics to console and Tauri backend
 */
async function reportStartupMetrics() {
  const themeInitDuration = (metrics.themeInitEnd || 0) - metrics.themeInitStart;
  const reactMountDuration =
    (metrics.reactMountEnd || 0) - (metrics.reactMountStart || 0);
  const totalDuration = (metrics.reactMountEnd || 0) - metrics.themeInitStart;

  // Get First Contentful Paint from Performance API
  try {
    const paintEntries = performance.getEntriesByType("paint");
    const fcp = paintEntries.find((entry) => entry.name === "first-contentful-paint");
    if (fcp) {
      metrics.firstPaintTime = fcp.startTime;
    }
  } catch (e) {
    // Silently fail if Performance API not available
  }

  // Format simple console output
  const consoleOutput = `⚡ STARTUP METRICS: Theme ${themeInitDuration.toFixed(2)}ms | React ${reactMountDuration.toFixed(2)}ms | Total ${totalDuration.toFixed(2)}ms`;
  
  console.log(consoleOutput);

  // Also log breakdown percentages
  const themePercent = ((themeInitDuration / totalDuration) * 100).toFixed(1);
  const reactPercent = ((reactMountDuration / totalDuration) * 100).toFixed(1);
  
  console.log(`📊 Breakdown: Theme ${themePercent}% | React ${reactPercent}%`);

  // Send to Tauri backend
  try {
    await invoke("log_startup_metrics", {
      themeInitMs: parseFloat(themeInitDuration.toFixed(2)),
      reactMountMs: parseFloat(reactMountDuration.toFixed(2)),
      totalMs: parseFloat(totalDuration.toFixed(2)),
      firstPaintMs: metrics.firstPaintTime ? parseFloat(metrics.firstPaintTime.toFixed(2)) : null,
    });
  } catch (e) {
    // Silently fail if Tauri command not available
  }

  // Performance warning if startup is slow
  if (totalDuration > 1000) {
    console.warn(
      `⚠️ Slow startup (${totalDuration.toFixed(2)}ms). Check for blocking operations.`
    );
  } else if (totalDuration > 500) {
    console.info(`✓ Acceptable startup (${totalDuration.toFixed(2)}ms)`);
  } else {
    console.log(`✨ Fast startup (${totalDuration.toFixed(2)}ms)`);
  }
}

/**
 * Format duration with appropriate unit
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(2)}ms`;
}
