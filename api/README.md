# Secure submissions API

This folder is a Node.js 22 Azure Functions v4 application. It receives website forms at `POST /api/inquiries` and writes an entity to the `WebsiteSubmissions` table in `marketingdevwus2stor`.

Production deploys this folder as the managed API of the Azure Static Web App. Managed Static Web Apps functions do not expose a managed identity to application code, so production uses an encrypted API environment variable named `SUBMISSIONS_STORAGE_CONNECTION_STRING`. The value is never sent to the browser or committed to source control. The code retains `DefaultAzureCredential` support for a standalone Function App or authenticated local development.

## Required Static Web Apps setting

In the Azure portal, open the Static Web App and go to **Settings > Environment variables**. Add:

- `SUBMISSIONS_STORAGE_CONNECTION_STRING`: the connection string for `marketingdevwus2stor`
- `SUBMISSIONS_TABLE_NAME`: `WebsiteSubmissions` (optional; this is the default)
- `ALLOWED_ORIGINS`: any additional production or preview origins, comma-separated (the two Sun Streak Studios domains are already accepted)

The API creates the `WebsiteSubmissions` table on its first successful connection if it does not already exist. Static Web Apps encrypts API environment variables at rest. Redeploy the site after adding or changing API settings.

## Deploy the API

The main Static Web Apps workflow deploys this folder because its `api_location` is `api`. The legacy standalone Function App workflow is manual-only.

## Local development

1. Copy `local.settings.example.json` to `local.settings.json`.
2. Keep `local.settings.json` untracked.
3. Set `SUBMISSIONS_STORAGE_CONNECTION_STRING` to a development storage connection string.
4. Run the Function App with `npm start` and the site through the Static Web Apps CLI so `/api` is proxied locally.

## Stored fields

Each entity includes:

- `PartitionKey`: form type plus UTC month
- `RowKey`: random submission UUID
- `submittedAtUtc`: typed UTC date/time
- `submittedAtIso`: ISO timestamp for easy export
- Azure Table's server-generated `Timestamp`
- form type and allowlisted form fields
- trusted platform IP headers, user agent, language, origin, referrer, host/protocol, content length, and invocation ID
- page, time-zone, language, screen, viewport, pixel ratio, touch, platform, and network-class metadata supplied by the browser

Cookies, authorization headers, authentication principal payloads, and arbitrary headers are deliberately not stored.

Because IP addresses and inquiry contents are personal data, set a documented retention period, restrict table access, and update the site's privacy notice before production use.
