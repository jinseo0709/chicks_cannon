# Azure infrastructure

`main.bicep` describes a Standard Azure Static Web App, a Linux Node.js 22
Functions v4 app with system-assigned identity, its storage account, and an
Azure SQL logical server/database. It does not link the Static Web App to the
Function App, grant SQL access, create a firewall exception, or deploy code.

The template requires a secure `sqlBootstrapPassword` parameter because the
SQL server ARM API requires it during creation. Microsoft Entra-only SQL
authentication is enabled, and the value is neither in the example parameters
nor emitted as an output. Supply a one-time value interactively to your own
deployment tooling; never check it into source control. Review regional SKU
availability and costs before creating resources.

From the repository root, validate and preview before deciding whether to
create anything:

```sh
az bicep build --file infra/main.bicep
az deployment group what-if --resource-group <resource-group> \
  --template-file infra/main.bicep --parameters @infra/parameters.example.json \
  --parameters sqlBootstrapPassword='<one-time-value>'
```

Resource group creation and `az deployment group create` are separate user
actions. Do not run them as part of local validation. After deployment:

1. Apply `apps/api/sql/001-leaderboard.sql` to the new database.
2. Edit `infra/sql/002-grant-function-identity.sql` to use the exact Function
   App resource name, then run it as the Entra SQL administrator. This grants
   only `db_datareader` and `db_datawriter`, not `db_owner`.
3. Configure the SQL server network path for the Function App and the operator.
   The template adds no broad firewall rule; prefer private connectivity where
   available.
4. Link the API to the Standard Static Web App:

   ```sh
   az staticwebapp functions link -n <swa-name> -g <resource-group> \
     --function-resource-id <function-resource-id>
   ```

5. Configure GitHub OIDC federation for the repository/workflow and set the
   repository variables described in `docs/azure-deployment.md`.
6. Register the single-tenant leaderboard API and SPA in Microsoft Entra ID and
   configure their IDs/scopes as described in
   `docs/microsoft-leaderboard-signin.md`.

Official references: [SWA BYO Functions](https://learn.microsoft.com/azure/static-web-apps/functions-bring-your-own), [Functions managed identity with SQL](https://learn.microsoft.com/azure/azure-functions/functions-identity-access-azure-sql-with-managed-identity).
