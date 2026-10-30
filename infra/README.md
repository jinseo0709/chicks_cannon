# Azure infrastructure

`main.bicep` provisions the web/API hosting resources for this game and points
the Function App at the existing Azure Cosmos DB for NoSQL account. It does not
create or update a Cosmos database or any existing container. The only game
data container is `ChicksCannonLeaderboard`; the `maze-rescue` container is
left untouched.

The example parameters identify the existing Cosmos account
`maze-rescue-ms-b7af62a9`. Replace `cosmosDatabaseId` with the database shown in
that account's Data Explorer. The Cosmos endpoint is derived from the account
name. The Function App uses its system-assigned managed identity; no account
keys are stored in the app or repository.

## Prepare the existing Cosmos account

1. Confirm the account uses the **Azure Cosmos DB for NoSQL** API and copy the
   existing database ID from Data Explorer. The resource group overview alone
   does not show the database ID or API type.
2. Set `COSMOS_ENDPOINT`, `COSMOS_DATABASE_ID`, and
   `COSMOS_CONTAINER_ID=ChicksCannonLeaderboard` for the migration command.
3. As an identity with Cosmos data-plane permission, create only the game
   container:

   ```sh
   npm run migrate:cosmos --workspace @chicks-cannon/api
   ```

   The migration checks that the database already exists and adds a container
   partitioned by `/participantId`, with the ranking index. It never creates a
   database or edits a different container. Existing database throughput is
   reused when that database has shared throughput configured.
4. After the Function App is deployed, grant its managed identity Cosmos DB
   Built-in Data Contributor on the new container only. The app cannot read or
   write other containers through this role assignment. See
   [Cosmos DB role setup](../docs/azure-deployment.md#cosmos-db-access).

## Deploy

From the repository root, validate the template and inspect the deployment
before creating resources:

```sh
az bicep build --file infra/main.bicep
az deployment group what-if --resource-group <resource-group> \
  --template-file infra/main.bicep --parameters @infra/parameters.example.json
```

Provisioning and deployment remain operator actions. After the hosting
resources exist, link the Function App to the Standard Static Web App if it is
not already linked, configure GitHub deployment variables, and apply the
Microsoft Entra app registration settings described in
`docs/microsoft-leaderboard-signin.md`.
