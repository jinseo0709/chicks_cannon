const { DefaultAzureCredential } = require('@azure/identity');
const { CosmosClient } = require('@azure/cosmos');

async function main() {
  const endpoint = process.env.COSMOS_ENDPOINT?.trim();
  const databaseId = process.env.COSMOS_DATABASE_ID?.trim();
  const containerId = process.env.COSMOS_CONTAINER_ID?.trim() || 'ChicksCannonLeaderboard';
  if (!endpoint || !databaseId) {
    throw new Error('Set COSMOS_ENDPOINT and COSMOS_DATABASE_ID before running this migration.');
  }

  const client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  const database = client.database(databaseId);
  await database.read();
  const { container, statusCode } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ['/participantId'] },
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/_etag/?' }],
      compositeIndexes: [[
        { path: '/bestScore', order: 'descending' },
        { path: '/achievedAt', order: 'ascending' },
        { path: '/participantId', order: 'ascending' },
      ]],
    },
  });
  console.log(statusCode === 201
    ? `Created the separate ${container.id} leaderboard container.`
    : `The separate ${container.id} leaderboard container already exists; no other container was changed.`);
  await client.dispose();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not create the leaderboard container.');
  process.exitCode = 1;
});
