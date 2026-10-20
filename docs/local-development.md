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
resets when the API process restarts and is not shared across devices. Shared
rankings require the deployed SQL store and Function App managed identity.

Keep local credentials in ignored `.env` or `local.settings.json` files; never
commit them. See [Azure deployment](./azure-deployment.md) for configuration.
