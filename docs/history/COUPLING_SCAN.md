# Coupling Scan Output (generated)

Generated from code/config files only (excludes `*.md`, `node_modules/`, `dist/`, `build/`).

## Counts
| Category | Match count |
|---|---:|
| base44_sdk_createClient | 4 |
| base44_entities | 116 |
| base44_auth | 11 |
| base44_integrations | 8 |
| missing_helpers_dotat | 17 |
| env_import_meta_or_process | 0 |
| network_fetch | 0 |
| network_axios | 0 |
| network_websocket | 0 |
| storage_local | 12 |
| timers | 7 |
| cors_preview_wix | 2 |
| react_query_refetchInterval | 1 |

## base44_sdk_createClient (4)
| Location | Excerpt |
|---|---|
| [package.json](package.json#L13) | (historical) Base44 SDK dependency entry |
| [src/api/base44Client.js](src/api/base44Client.js#L1) | (historical) SDK createClient import |
| [src/api/base44Client.js](src/api/base44Client.js#L2) | (historical) SDK auth-utils import |
| [src/api/base44Client.js](src/api/base44Client.js#L5) | export const base44 = createClient({ |

## base44_entities (116)
| Location | Excerpt |
|---|---|
| [src/api/entities.js](src/api/entities.js#L4) | export const Wrestler = base44.entities.Wrestler; |
| [src/api/entities.js](src/api/entities.js#L6) | export const ForumTopic = base44.entities.ForumTopic; |
| [src/api/entities.js](src/api/entities.js#L8) | export const ForumReply = base44.entities.ForumReply; |
| [src/api/entities.js](src/api/entities.js#L10) | export const WrestlerRating = base44.entities.WrestlerRating; |
| [src/api/entities.js](src/api/entities.js#L12) | export const ComparisonReport = base44.entities.ComparisonReport; |
| [src/api/entities.js](src/api/entities.js#L14) | export const Tournament = base44.entities.Tournament; |
| [src/api/entities.js](src/api/entities.js#L16) | export const Report = base44.entities.Report; |
| [src/api/entities.js](src/api/entities.js#L18) | export const BannedUser = base44.entities.BannedUser; |
| [src/api/entities.js](src/api/entities.js#L20) | export const Achievement = base44.entities.Achievement; |
| [src/api/entities.js](src/api/entities.js#L22) | export const PredictionLeague = base44.entities.PredictionLeague; |
| [src/api/entities.js](src/api/entities.js#L24) | export const LeagueMembership = base44.entities.LeagueMembership; |
| [src/api/entities.js](src/api/entities.js#L26) | export const TournamentPrediction = base44.entities.TournamentPrediction; |
| [src/api/entities.js](src/api/entities.js#L28) | export const MatchPrediction = base44.entities.MatchPrediction; |
| [src/api/entities.js](src/api/entities.js#L30) | export const Notification = base44.entities.Notification; |
| [src/api/entities.js](src/api/entities.js#L32) | export const DataCorrectionRequest = base44.entities.DataCorrectionRequest; |
| [src/api/entities.js](src/api/entities.js#L34) | export const Match = base44.entities.Match; |
| [src/api/entities.js](src/api/entities.js#L36) | export const BashoRecord = base44.entities.BashoRecord; |
| [src/components/comparison/SaveComparisonDialog.jsx](src/components/comparison/SaveComparisonDialog.jsx#L20) | mutationFn: (data) => base44.entities.ComparisonReport.create(data), |
| [src/components/forum/BanUserDialog.jsx](src/components/forum/BanUserDialog.jsx#L31) | await base44.entities.BannedUser.create({ |
| [src/components/forum/CreateTopicDialog.jsx](src/components/forum/CreateTopicDialog.jsx#L24) | await base44.entities.ForumTopic.create({ |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L19) | queryFn: () => base44.entities.Report.list('-created_date', 200), |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L25) | queryFn: () => base44.entities.BannedUser.list('-created_date', 100), |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L31) | queryFn: () => base44.entities.ForumTopic.list('-created_date', 100), |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L36) | mutationFn: ({ id, data }) => base44.entities.Report.update(id, data), |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L46) | await base44.entities.ForumTopic.delete(id); |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L48) | await base44.entities.ForumReply.delete(id); |
| [src/components/forum/ModerationPanel.jsx](src/components/forum/ModerationPanel.jsx#L59) | mutationFn: (id) => base44.entities.BannedUser.delete(id), |
| [src/components/forum/ReportDialog.jsx](src/components/forum/ReportDialog.jsx#L23) | await base44.entities.Report.create({ |
| [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L38) | const all = await base44.entities.Notification.list('-created_date', 50); |
| [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L35) | const predictions = await base44.entities.TournamentPrediction.list('-created_date', 500); |
| [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L27) | const league = await base44.entities.PredictionLeague.create({ |
| [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L36) | await base44.entities.LeagueMembership.create({ |
| [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L21) | const allLeagues = await base44.entities.PredictionLeague.list('-created_date', 200); |
| [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L32) | const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500); |
| [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L42) | await base44.entities.LeagueMembership.create({ |
| [src/components/predictions/JoinLeagueDialog.jsx](src/components/predictions/JoinLeagueDialog.jsx#L47) | await base44.entities.PredictionLeague.update(league.id, { |
| [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L19) | queryFn: () => base44.entities.Wrestler.list('-rank', 500), |
| [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L43) | const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500); |
| [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L56) | await base44.entities.TournamentPrediction.create({ |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L57) | const all = await base44.entities.WrestlerRating.list('-created_date', 500); |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L65) | const all = await base44.entities.WrestlerRating.list('-created_date', 500); |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L72) | mutationFn: (data) => base44.entities.WrestlerRating.create(data), |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L84) | mutationFn: ({ id, data }) => base44.entities.WrestlerRating.update(id, data), |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L200) | const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L201) | const allRecords = await base44.entities.BashoRecord.list('-created_date', 10000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L237) | await base44.entities.BashoRecord.bulkCreate(toCreate); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L282) | const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L328) | await base44.entities.Wrestler.bulkCreate(stubWrestlers); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L363) | const allWrestlers = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L386) | await base44.entities.Wrestler.delete(sorted[i].id); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L393) | const allBashoRecords = await base44.entities.BashoRecord.list('-created_date', 10000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L415) | await base44.entities.BashoRecord.delete(sorted[i].id); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L452) | const existing = await base44.entities.Wrestler.list('-created_date', 500); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L455) | await base44.entities.Wrestler.delete(wrestler.id); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L460) | await base44.entities.Wrestler.bulkCreate(data.wrestlers); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L488) | const existing = await base44.entities.Match.list('-created_date', 500); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L491) | await base44.entities.Match.delete(match.id); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L498) | const tournaments = await base44.entities.Tournament.list('-start_date', 100); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L509) | await base44.entities.Match.bulkCreate(matchesWithIds); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L560) | const wrestlers = await base44.entities.Wrestler.list('-created_date', 500); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L569) | await base44.entities.Wrestler.update(matchingWrestler.id, { |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L593) | data = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L595) | data = await base44.entities.BashoRecord.list('-created_date', 10000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L666) | const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L690) | await base44.entities.Wrestler.bulkCreate(toCreate); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L716) | await base44.entities.Wrestler.update(existing.id, record); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L720) | await base44.entities.Wrestler.create(record); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L766) | const existingRecords = await base44.entities.BashoRecord.list('-created_date', 10000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L769) | const existingWrestlers = await base44.entities.Wrestler.list('-created_date', 5000); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L798) | await base44.entities.BashoRecord.bulkCreate(toCreate); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L831) | await base44.entities.DataCorrectionRequest.create({ |
| [src/pages/Forum.jsx](src/pages/Forum.jsx#L20) | queryFn: () => base44.entities.ForumTopic.list('-created_date', 50), |
| [src/pages/Forum.jsx](src/pages/Forum.jsx#L32) | return await base44.entities.User.list('-created_date', 500); |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L37) | const topics = await base44.entities.ForumTopic.list('-created_date', 100); |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L51) | const allReplies = await base44.entities.ForumReply.list('-created_date', 200); |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L70) | return await base44.entities.User.list('-created_date', 500); |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L80) | base44.entities.ForumTopic.update(topic.id, { |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L87) | mutationFn: (data) => base44.entities.ForumReply.create(data), |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L90) | await base44.entities.ForumTopic.update(topicId, { |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L117) | return base44.entities.ForumReply.update(reply.id, { |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L130) | mutationFn: () => base44.entities.ForumTopic.delete(topicId), |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L138) | mutationFn: (replyId) => base44.entities.ForumReply.delete(replyId), |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L146) | mutationFn: () => base44.entities.ForumTopic.update(topicId, { |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L156) | mutationFn: () => base44.entities.ForumTopic.update(topicId, { |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L90) | queryFn: () => base44.entities.Wrestler.list('-rank', 500), |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L99) | return await base44.entities.BashoRecord.list('-created_date', 5000); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L47) | const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L61) | queryFn: () => base44.entities.BashoRecord.list('-basho', 5000), |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L67) | const allWrestlers = await base44.entities.Wrestler.list('-created_date', 1000); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L68) | const allRecords = await base44.entities.BashoRecord.list('-basho', 5000); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L90) | const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 500); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L114) | const allPredictions = await base44.entities.MatchPrediction.list('-created_date', 50); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L128) | return base44.entities.MatchPrediction.create(data); |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L27) | const allMemberships = await base44.entities.LeagueMembership.list('-created_date', 500); |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L39) | queryFn: () => base44.entities.PredictionLeague.list('-created_date', 200), |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L48) | queryFn: () => base44.entities.Tournament.list('-start_date', 100), |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L57) | const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500); |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L20) | const leagues = await base44.entities.PredictionLeague.list('-created_date', 200); |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L34) | const allMemberships = await base44.entities.LeagueMembership.list('-total_points', 500); |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L48) | const allPredictions = await base44.entities.TournamentPrediction.list('-created_date', 500); |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L65) | queryFn: () => base44.entities.Tournament.list('-start_date', 100), |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L72) | return await base44.entities.User.list('-created_date', 500); |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L32) | const users = await base44.entities.User.list('-created_date', 500); |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L46) | const allAchievements = await base44.entities.Achievement.list('-created_date', 200); |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L60) | const allTopics = await base44.entities.ForumTopic.list('-created_date', 100); |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L74) | const allReplies = await base44.entities.ForumReply.list('-created_date', 200); |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L18) | const allReports = await base44.entities.ComparisonReport.list('-created_date', 200); |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L27) | const all = await base44.entities.Wrestler.list('-rank', 500); |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L41) | base44.entities.ComparisonReport.update(reportId, { |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L52) | return base44.entities.ComparisonReport.update(reportId, { |
| [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L23) | return await base44.entities.Tournament.list('-start_date', 100); |
| [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L33) | queryFn: () => base44.entities.Wrestler.list('-rank', 500), |
| [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L40) | const allTopics = await base44.entities.ForumTopic.list('-created_date', 100); |
| [src/pages/TournamentHub.jsx](src/pages/TournamentHub.jsx#L53) | return await base44.entities.Match.list('-match_date', 500); |
| [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L19) | queryFn: () => base44.entities.Tournament.list('-start_date', 100), |
| [src/pages/Tournaments.jsx](src/pages/Tournaments.jsx#L179) | queryFn: () => base44.entities.Wrestler.list('-rank', 500), |

## base44_auth (11)
| Location | Excerpt |
|---|---|
| [src/components/navigation/FloatingNav.jsx](src/components/navigation/FloatingNav.jsx#L29) | queryFn: () => base44.auth.me(), |
| [src/components/ratings/WrestlerRatingCard.jsx](src/components/ratings/WrestlerRatingCard.jsx#L51) | queryFn: () => base44.auth.me(), |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L150) | queryFn: () => base44.auth.me(), |
| [src/pages/Forum.jsx](src/pages/Forum.jsx#L25) | queryFn: () => base44.auth.me(), |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L63) | queryFn: () => base44.auth.me(), |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L28) | queryFn: () => base44.auth.me(), |
| [src/pages/PredictionGame.jsx](src/pages/PredictionGame.jsx#L20) | queryFn: () => base44.auth.me(), |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L60) | queryFn: () => base44.auth.me(), |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L24) | queryFn: () => base44.auth.me(), |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L88) | mutationFn: (data) => base44.auth.updateMe(data), |
| [src/pages/SharedComparison.jsx](src/pages/SharedComparison.jsx#L35) | queryFn: () => base44.auth.me(), |

## base44_integrations (8)
| Location | Excerpt |
|---|---|
| [src/api/integrations.js](src/api/integrations.js#L6) | export const Core = base44.integrations.Core; |
| [src/api/integrations.js](src/api/integrations.js#L8) | export const InvokeLLM = base44.integrations.Core.InvokeLLM; |
| [src/api/integrations.js](src/api/integrations.js#L10) | export const SendEmail = base44.integrations.Core.SendEmail; |
| [src/api/integrations.js](src/api/integrations.js#L12) | export const UploadFile = base44.integrations.Core.UploadFile; |
| [src/api/integrations.js](src/api/integrations.js#L14) | export const GenerateImage = base44.integrations.Core.GenerateImage; |
| [src/api/integrations.js](src/api/integrations.js#L16) | export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile; |
| [src/api/integrations.js](src/api/integrations.js#L18) | export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl; |
| [src/api/integrations.js](src/api/integrations.js#L20) | export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile; |

## missing_helpers_dotat (17)
| Location | Excerpt |
|---|---|
| [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L11) | import { markNotificationAsRead, markAllAsRead } from '../.@/api/functions/notificationSystem'; |
| [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L6) | import { notifyMatchResult } from '../.@/api/functions/notificationSystem'; |
| [src/components/predictions/AdminScoreButton.jsx](src/components/predictions/AdminScoreButton.jsx#L8) | import { scoreAllPredictionsForTournament } from '../.@/api/functions/predictionScoring'; |
| [src/components/predictions/CreateLeagueDialog.jsx](src/components/predictions/CreateLeagueDialog.jsx#L9) | import { generateLeagueCode } from '../.@/api/functions/predictionScoring'; |
| [src/components/predictions/MakePredictionDialog.jsx](src/components/predictions/MakePredictionDialog.jsx#L8) | import { notifyPredictionClosing } from '../.@/api/functions/notificationSystem'; |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L13) | import fetchRealSumoData from '.@/api/functions/fetchRealSumoData'; |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L14) | import fetchRealMatchHistory from '.@/api/functions/fetchRealMatchHistory'; |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L15) | import fetchWrestlerPhotos from '.@/api/functions/fetchWrestlerPhotos'; |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L16) | import resolveJSAProfiles from '.@/api/functions/resolveJSAProfiles'; |
| [src/pages/Forum.jsx](src/pages/Forum.jsx#L12) | import { getUserDisplayName } from '.@/api/functions/getUserDisplayName'; |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L14) | import { updateForumStats } from '.@/api/functions/achievementSystem'; |
| [src/pages/ForumTopic.jsx](src/pages/ForumTopic.jsx#L15) | import { notifyForumReply } from '.@/api/functions/notificationSystem'; |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L24) | import syncLiveData from '.@/api/functions/syncLiveData'; |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L25) | import { getUserPreferences, saveUserPreferences, toggleFollowWrestler, toggleWidget, updateNotificationSettings } from '.@/api/functions… |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L13) | import { calculateMatchProbability, fetchMatchOdds } from '.@/api/functions/matchPrediction'; |
| [src/pages/PredictionLeague.jsx](src/pages/PredictionLeague.jsx#L10) | import { getDisplayNameFromEmail } from '.@/api/functions/getUserDisplayName'; |
| [src/pages/Profile.jsx](src/pages/Profile.jsx#L13) | import { getUserDisplayName } from '.@/api/functions/getUserDisplayName'; |

## env_import_meta_or_process (0)
| Location | Excerpt |
|---|---|
| _None_ | _None_ |

## network_fetch (0)
| Location | Excerpt |
|---|---|
| _None_ | _None_ |

## network_axios (0)
| Location | Excerpt |
|---|---|
| _None_ | _None_ |

## network_websocket (0)
| Location | Excerpt |
|---|---|
| _None_ | _None_ |

## storage_local (12)
| Location | Excerpt |
|---|---|
| [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L13) | const lastSyncTime = localStorage.getItem('sumo_last_sync'); |
| [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L14) | const result = localStorage.getItem('sumo_last_sync_result'); |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L133) | return localStorage.getItem('import_entity') \|\| 'Wrestler'; |
| [src/pages/DataImport.jsx](src/pages/DataImport.jsx#L157) | localStorage.setItem('import_entity', selectedEntity); |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L52) | localStorage.getItem('auto_sync_enabled') === 'true' |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L61) | const saved = localStorage.getItem('skip_stubs_leaderboard'); |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L172) | localStorage.setItem('skip_stubs_leaderboard', newValue.toString()); |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L413) | localStorage.setItem('auto_sync_enabled', newValue.toString()); |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L22) | return localStorage.getItem('skip_stubs') === 'true'; |
| [src/pages/MatchPredictor.jsx](src/pages/MatchPredictor.jsx#L170) | localStorage.setItem('skip_stubs', newValue.toString()); |
| [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L9) | const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('sumo_high_score') \|\| '0')); |
| [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L108) | localStorage.setItem('sumo_high_score', score.toString()); |

## timers (7)
| Location | Excerpt |
|---|---|
| [src/components/achievements/AchievementNotification.jsx](src/components/achievements/AchievementNotification.jsx#L8) | const timer = setTimeout(() => { |
| [src/components/sync/SyncStatus.jsx](src/components/sync/SyncStatus.jsx#L30) | const interval = setInterval(updateStatus, 30000); // Update every 30s |
| [src/components/ui/use-toast.jsx](src/components/ui/use-toast.jsx#L28) | const timeout = setTimeout(() => { |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L377) | const interval = setInterval(() => { |
| [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L23) | setTimeout(() => setPlayer1Pushing(false), 200); |
| [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L34) | gameLoopRef.current = setInterval(() => { |
| [src/pages/SumoGame.jsx](src/pages/SumoGame.jsx#L38) | setTimeout(() => setPlayer2Pushing(false), 200); |

## cors_preview_wix (2)
| Location | Excerpt |
|---|---|
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L318) | <p className="text-zinc-400 mb-2">Unable to load wrestler data in preview mode.</p> |
| [src/pages/Leaderboard.jsx](src/pages/Leaderboard.jsx#L320) | This is a known Base44 SDK limitation with CORS. The app will work correctly in production. |

## react_query_refetchInterval (1)
| Location | Excerpt |
|---|---|
| [src/components/notifications/NotificationCenter.jsx](src/components/notifications/NotificationCenter.jsx#L42) | refetchInterval: 30000 // Refetch every 30 seconds |
