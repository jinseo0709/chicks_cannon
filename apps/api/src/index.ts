import { app } from '@azure/functions';
import { createLeaderboardHandlers } from './functions/leaderboard';
import { authenticateEntraRequest } from './leaderboard/entra-auth';
import { CosmosLeaderboardStore } from './leaderboard/cosmos-store';
import { MemoryLeaderboardStore } from './leaderboard/memory-store';
import { LeaderboardService } from './leaderboard/service';

const store = process.env.LEADERBOARD_STORE === 'cosmos'
  ? new CosmosLeaderboardStore()
  : new MemoryLeaderboardStore();
const handlers = createLeaderboardHandlers(new LeaderboardService(store), authenticateEntraRequest);

app.http('leaderboard-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: handlers.get,
});

app.http('leaderboard-submit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: handlers.post,
});
