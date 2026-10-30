# Azure deployment

The leaderboard uses the existing Azure Cosmos DB for NoSQL account
`maze-rescue-ms-b7af62a9` in resource group `grill-me-edu`. The game gets one
separate `ChicksCannonLeaderboard` container inside an existing database. No
`maze-rescue` database or container is changed, and the infrastructure template
does not create a new SQL server or Cosmos account.

Local builds and tests do not contact or change Azure resources. Creating the
game container and granting the Function identity access are explicit Azure
operations.

## Cosmos DB access

The resource-group screenshot confirms the account name and type, but does not
show its Cosmos API type, existing database ID, or throughput mode. Confirm in
Cosmos DB **Data Explorer** that it uses the **NoSQL** API and note the existing
database ID. The new container uses `/participantId` as its partition key and
shares database throughput if shared throughput is configured.

To create only the new game container, set these environment values and run the
migration with an identity allowed to create a container in the existing DB:

```powershell
$env:COSMOS_ENDPOINT = 'https://maze-rescue-ms-b7af62a9.documents.azure.com:443/'
$env:COSMOS_DATABASE_ID = '<existing-database-id>'
$env:COSMOS_CONTAINER_ID = 'ChicksCannonLeaderboard'
npm.cmd run migrate:cosmos --workspace @chicks-cannon/api
```

The migration verifies that the database exists and creates only
`ChicksCannonLeaderboard`. It does not create a database or modify another
container. Cosmos DB's Entra data-plane roles are separate from ordinary Azure
Contributor permissions; the Function App needs a Cosmos data role to access
items. ([Microsoft Cosmos DB role-based access](https://learn.microsoft.com/azure/cosmos-db/nosql/how-to-connect-role-based-access-control))

After the Function App exists, assign its managed identity the built-in Data
Contributor role scoped to this container:

```powershell
az cosmosdb sql role assignment create `
  --resource-group grill-me-edu `
  --account-name maze-rescue-ms-b7af62a9 `
  --principal-id <function-managed-identity-object-id> `
  --role-definition-id 00000000-0000-0000-0000-000000000002 `
  --scope '/dbs/<existing-database-id>/colls/ChicksCannonLeaderboard'
```

## Hosting and sign-in

1. Copy `infra/parameters.example.json` to a private parameters file and set
   `cosmosDatabaseId` to the existing database ID. Review names and costs.
2. Validate and inspect the infrastructure deployment:

   ```powershell
   az bicep build --file infra/main.bicep
   az deployment group what-if --resource-group <resource-group> `
     --template-file infra/main.bicep --parameters @<private-parameters-file>
   ```

3. When ready, an operator deploys the hosting resources. The Function App
   settings point to Cosmos and use its managed identity; no Cosmos keys are
   stored in the app.
4. Link the Function App to the Standard Static Web App if it is not already
   linked:

   ```powershell
   az staticwebapp functions link -n <swa-name> -g <resource-group> `
     --function-resource-id <function-resource-id>
   ```

5. Configure GitHub OIDC and deployment settings: `AZURE_CLIENT_ID`,
   `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_FUNCTIONAPP_NAME`, and
   the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.
6. Register the Microsoft Entra API and SPA, then configure GitHub web build
   variables and Function App token-validation settings as described in
   [Microsoft company sign-in](./microsoft-leaderboard-signin.md).
7. Deploy and verify `https://<swa-host>/api/leaderboard`, then complete a
   campaign to check automatic registration.

## Rollback

Revert and redeploy the previous application revision. Leave
`ChicksCannonLeaderboard` in the shared Cosmos account unless a database owner
requests its removal; no rollback step should delete or modify maze-rescue
data.

See [local development](./local-development.md) for local commands and the
in-memory store behavior.
