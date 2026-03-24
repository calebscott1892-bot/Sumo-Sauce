/// <reference types="vite/client" />

/**
 * Lightweight interaction tracking (local only).
 *
 * Events are stored in memory for release diagnostics. Console logging is
 * quiet by default and can be enabled explicitly with local storage or the
 * window helper installed by `initAnalyticsDiagnostics()`.
 */

export type AnalyticsEvent = {
  type: string;
  properties: Record<string, string | number | boolean>;
  timestamp: number;
};

const eventLog: AnalyticsEvent[] = [];
const DEBUG_STORAGE_KEY = 'sumosauce:debug-analytics';

declare global {
  interface Window {
    __SUMOWATCH_ANALYTICS__?: {
      getEventLog: () => ReadonlyArray<AnalyticsEvent>;
      clearEventLog: () => void;
      enableDebug: () => void;
      disableDebug: () => void;
      isDebugEnabled: () => boolean;
    };
  }
}

function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearEventLog(): void {
  eventLog.length = 0;
}

export function initAnalyticsDiagnostics(): void {
  if (typeof window === 'undefined' || window.__SUMOWATCH_ANALYTICS__) return;

  window.__SUMOWATCH_ANALYTICS__ = {
    getEventLog: () => [...eventLog],
    clearEventLog,
    enableDebug: () => {
      try {
        window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
      } catch {
        // ignore storage failures
      }
    },
    disableDebug: () => {
      try {
        window.localStorage.removeItem(DEBUG_STORAGE_KEY);
      } catch {
        // ignore storage failures
      }
    },
    isDebugEnabled,
  };
}

function track(type: string, properties: Record<string, string | number | boolean> = {}): void {
  const event: AnalyticsEvent = {
    type,
    properties,
    timestamp: Date.now(),
  };
  eventLog.push(event);

  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[Sumo Sauce Analytics]', type, properties);
  }
}

/** Track a rikishi profile page view. */
export function trackRikishiPageView(rikishiId: string): void {
  track('rikishi_page_view', { rikishiId });
}

/** Track a basho standings page view. */
export function trackBashoPageView(bashoId: string, division: string): void {
  track('basho_page_view', { bashoId, division });
}

/** Track a basho overview page view. */
export function trackBashoOverviewView(bashoId: string): void {
  track('basho_overview_view', { bashoId });
}

/** Track a basho browser page view. */
export function trackBashoBrowserView(): void {
  track('basho_browser_view', {});
}

/** Track a rikishi directory page view. */
export function trackDirectoryView(): void {
  track('rikishi_directory_view', {});
}

/** Track a basho comparison page view. */
export function trackBashoCompareView(bashoA: string, bashoB: string): void {
  track('basho_compare_view', { bashoA, bashoB });
}

/** Track a search query. */
export function trackSearchUsage(
  query: string,
  resultCount: number,
  context: { surface?: string; tab?: string } = {},
): void {
  track('search_usage', {
    query,
    resultCount,
    ...(context.surface ? { surface: context.surface } : {}),
    ...(context.tab ? { tab: context.tab } : {}),
  });
}

/** Track a search page view. */
export function trackSearchPageView(): void {
  track('search_page_view', {});
}

/** Track a rikishi comparison page view. */
export function trackCompareUsage(rikishiA: string, rikishiB: string): void {
  track('compare_usage', { rikishiA, rikishiB });
}

/** Track rivalry explorer page view. */
export function trackRivalryExplorerView(): void {
  track('rivalry_explorer_view', {});
}

/** Track global stats / analytics page view. */
export function trackGlobalStatsView(): void {
  track('global_stats_view', {});
}

/** Track kimarite analytics page view. */
export function trackKimariteAnalyticsView(): void {
  track('kimarite_analytics_view', {});
}

/** Track era analytics page view. */
export function trackEraAnalyticsView(): void {
  track('era_analytics_view', {});
}

/** Track basho day results page view. */
export function trackBashoDayResultsView(bashoId: string, division: string, day: number): void {
  track('basho_day_results_view', { bashoId, division, day });
}

/** Track basho timeline page view. */
export function trackBashoTimelineView(): void {
  track('basho_timeline_view', {});
}

/** Track leaderboard page view. */
export function trackLeaderboardView(): void {
  track('leaderboard_view', {});
}

/** Track CopyLink / share action. */
export function trackShareAction(page: string, url: string): void {
  track('share_action', { page, url });
}

/** Track navigation event. */
export function trackNavigation(from: string, to: string): void {
  track('navigation', { from, to });
}

/** Retrieve a read-only copy of all recorded events. */
export function getEventLog(): ReadonlyArray<AnalyticsEvent> {
  return eventLog;
}
