# Release Candidate Checklist

## Automated checks completed

- `npm run typecheck`
- `node scripts/validate-profiles.mjs`
- `npm run build`
- `npm run verify:release-candidate`
  - Helper added in this pass so the main RC gate can be re-run with one command

## Route and UX audit covered in this pass

- Homepage front door and shared shell metadata behavior
- Command palette / quick-search states and action coverage
- Search page query state, metadata wording, and search tracking
- Rikishi / compare / rivalry / basho surfaces for share-state consistency
- Basho browser and rikishi directory view instrumentation
- Not-found and watchlist routes for robots/indexing safety

## Manual verification still needed before release

- Mobile device pass on iOS Safari and Android Chrome
  - Command palette open/close behavior
  - Share button behavior
  - Sticky nav and route transitions
- Social/share preview verification on the deployed production domain
  - Canonical URL
  - OpenGraph image resolution
  - Twitter card preview
- Clipboard fallback behavior in non-secure or privacy-restricted browser contexts
- Admin/internal routes on the deployed environment
  - Access controls
  - Noindex expectations
- Final visual QA for long shikona, long stable names, and dense leaderboard states

## Known non-blocking issues

- Profile validation still reports 5 existing `batchRef` warnings
  - Higonomaru
  - Chiyodaigo
  - Tochiseiryu
  - Fujinoshin
  - Satsumao
- Analytics remain local-only diagnostics, not a production analytics backend
- Watchlist data remains local-first and device-specific by design

## Suggested RC sign-off order

1. Run `npm run verify:release-candidate`
2. Check the homepage, search, command palette, basho overview, compare, and leaderboard on desktop
3. Repeat a shorter pass on mobile
4. Verify share previews on the deployed URL
5. Confirm there are no release-blocking regressions in trust wording or verified-image presentation
