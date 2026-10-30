# Local development

## Requirements

- Node.js 22 and npm.
- Azure Functions Core Tools v4 to run the API locally.

## Start the app

From the repository root:

```sh
npm ci
npm run build
npm test
npm run dev:api
```

In a second terminal, run `npm run dev:web`. Vite serves the React app and
proxies `/api` requests to `http://127.0.0.1:7071`. The local API uses its
in-memory leaderboard store unless explicitly configured otherwise. Its data
resets when the API process restarts and is not shared across devices. To use
the shared Cosmos leaderboard locally, set `LEADERBOARD_STORE=cosmos`, the three
`COSMOS_*` settings from `apps/api/.env.example`, and sign in to Azure CLI with
an identity granted Cosmos data-plane access to the game container.

Keep local credentials in ignored `.env` or `local.settings.json` files; never
commit them. See [Azure deployment](./azure-deployment.md) for configuration.
