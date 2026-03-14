/**
 * Lightweight interaction tracking (local only).
 *
 * All events are logged to the console and stored in an in-memory array.
 * The structure is designed for easy future integration with a real analytics
 * service — simply replace the `track` implementation.
 */

export type AnalyticsEvent = {
  type: string;
  properties: Record<string, string | number | boolean>;
  timestamp: number;
};

const eventLog: AnalyticsEvent[] = [];

function track(type: string, properties: Record<string, string | number | boolean> = {}): void {
  const event: AnalyticsEvent = {
    type,
    properties,
    timestamp: Date.now(),
  };
  eventLog.push(event);
  // eslint-disable-next-line no-console
  console.log('[SumoWatch Analytics]', type, properties);
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
export function trackSearchUsage(query: string, resultCount: number): void {
  track('search_usage', { query, resultCount });
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
