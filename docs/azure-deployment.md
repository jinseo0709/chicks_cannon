# Azure deployment

This repository prepares the app for Azure deployment; the deployment steps
below create billable cloud resources and remain an operator action. No Azure
resources are created by local builds or tests.

## Prerequisites

- An Azure subscription, resource group, and permissions to create the listed
  services.
- Azure CLI with Bicep support; a Microsoft Entra group or user for SQL admin.
- GitHub repository administration access to configure OIDC and variables.
- Azure Static Web Apps **Standard** plan. BYO Functions API linkage requires
  Standard; the linked API is served under `/api`. SWA PR preview environments
  do not support the linked bring-your-own API.

## Provision and configure

1. Review resource names, regional SKU availability, and estimated cost. Copy
   `infra/parameters.example.json` to a private local file and replace its
   example names and Entra IDs.
2. Run `az bicep build --file infra/main.bicep` and inspect `az deployment group
   what-if` output. The SQL ARM API requires a bootstrap password parameter;
   provide a one-time value through a secure prompt or secret store. Entra-only
   authentication is enabled and the template does not expose that value.
3. When ready, the operator creates the resource group and deploys the template
   with `az deployment group create`. This step is intentionally not part of
   repository validation.
4. Apply `apps/api/sql/001-leaderboard.sql` to the database. As the Entra SQL
   administrator, update and run `infra/sql/002-grant-function-identity.sql`
   using the exact Function App name. The Function identity receives only
   `db_datareader` and `db_datawriter`.
5. Configure a network path to SQL for the Function App and administrative
   workstation. The template deliberately creates no allow-all firewall rule.
6. Link the Function App to the Standard Static Web App:

   ```sh
   az staticwebapp functions link -n <swa-name> -g <resource-group> \
     --function-resource-id <function-resource-id>
   ```

7. Configure a GitHub federated identity credential for this repository and
   the `deploy-api` workflow identity. Add these Actions repository variables:
   `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, and
   `AZURE_FUNCTIONAPP_NAME`. Grant that principal the minimum deployment
   permissions needed for the Function App. Set
   `AZURE_STATIC_WEB_APPS_API_TOKEN` as an Actions secret for the web workflow.
8. Push to `main` or run the workflows manually. The web workflow uploads the
   prebuilt Vite bundle and leaves `/api` for the linked Function App. The API
   workflow uses GitHub OIDC; neither workflow provisions infrastructure.
9. Configure Microsoft Entra app registrations, Static Web App build variables,
   and Function App token-validation settings by following
   [Microsoft company sign-in](./microsoft-leaderboard-signin.md).
10. Verify `https://<swa-host>/api/leaderboard` and submit a test score through
    the game. Remove the test entry through an approved data maintenance
    process if needed.

For a staging environment, use a separate resource group, Static Web App,
Function App, database, and GitHub environment/variables. PR preview URLs can
serve the static app, but the linked BYO Function API is unavailable there.

## Rollback

Revert the application commit and redeploy the previous revision. For schema
changes, use a reviewed forward migration; dropping the SQL database or
resources can delete rankings and must be a deliberate operator action.

See [local development](./local-development.md) for local commands and the
in-memory store behavior.
