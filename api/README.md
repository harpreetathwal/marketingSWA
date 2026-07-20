# Secure submissions API

This folder is a Node.js 22 Azure Functions v4 application. It receives the three website forms at `POST /api/inquiries` and writes an entity to the `WebsiteSubmissions` table in `marketingdevwus2stor`.

The application uses Microsoft Entra ID and the Function App's system-assigned managed identity. It does not use or return a storage key, connection string, or SAS token for submission data.

## Azure resource to create

Create a **Linux Azure Function App** with these settings:

- Hosting: **Flex Consumption**
- Runtime: **Node.js 22**
- Functions runtime: **4.x**
- Region: the same region as `marketingdevwus2stor`
- Host storage: `marketingdevwus2stor` is acceptable for this small HTTP-only API, though a dedicated non-public host storage account gives stronger isolation
- Application Insights: enabled
- Identity: system-assigned managed identity enabled
- Suggested name: `marketing-dev-wus2-submissions-api` plus a suffix if the name is already taken

The Static Web App must use the **Standard** plan to link this Function App as a bring-your-own backend.

## Provision with Azure CLI

Replace every angle-bracket value before running these commands. First inspect the storage region and create the table:

```powershell
az storage account show --resource-group <RESOURCE_GROUP> --name marketingdevwus2stor --query primaryLocation -o tsv
az storage table create --account-name marketingdevwus2stor --name WebsiteSubmissions --auth-mode login
```

Create the Node.js 22 Flex Consumption Function App in that returned region:

```powershell
az functionapp create --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP_NAME> --storage-account marketingdevwus2stor --flexconsumption-location <REGION> --runtime node --runtime-version 22
az functionapp identity assign --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP_NAME>
```

Get the identity object ID and the exact table resource scope:

```powershell
$functionPrincipalId = az functionapp identity show --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP_NAME> --query principalId -o tsv
$storageId = az storage account show --resource-group <RESOURCE_GROUP> --name marketingdevwus2stor --query id -o tsv
$tableScope = "$storageId/tableServices/default/tables/WebsiteSubmissions"
az role assignment create --assignee-object-id $functionPrincipalId --assignee-principal-type ServicePrincipal --role "Storage Table Data Contributor" --scope $tableScope
```

The role is intentionally scoped to one table. Do not grant Owner, Contributor, Storage Account Contributor, or account-wide access for this data path.

Add the non-secret runtime settings. Include every production Static Web Apps hostname and custom domain in `ALLOWED_ORIGINS`, separated by commas and without trailing slashes:

```powershell
az functionapp config appsettings set --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP_NAME> --settings AZURE_STORAGE_ACCOUNT_NAME=marketingdevwus2stor SUBMISSIONS_TABLE_NAME=WebsiteSubmissions ALLOWED_ORIGINS=https://<STATIC_WEB_APP_HOSTNAME>
```

Role assignments can take several minutes to propagate.

## Deploy the API

The workflow at `.github/workflows/main_marketing-dev-wus2-api.yml` automatically tests and deploys this folder when a commit on `main` changes a path under `api/`. It authenticates to Azure through the OIDC configuration created by the Function App deployment center.

For a manual deployment from this `api` directory:

```powershell
npm ci
func azure functionapp publish <FUNCTION_APP_NAME>
```

## Link it to Azure Static Web Apps

1. Confirm the Static Web App is on the Standard plan.
2. Open the Static Web App in Azure Portal.
3. Select **Settings > APIs > Production > Link**.
4. Choose **Function App**, then select this Function App and its production slot.
5. Keep the Function App's default `/api` route prefix.

The Static Web Apps deployment workflow has `api_location: ""` because this repository now uses a separately deployed linked backend. Linking establishes the `/api` proxy and adds the `Azure Static Web Apps (Linked)` authentication provider to prevent anonymous direct access to the Function App hostname. Do not remove that provider or enable unauthenticated App Service access afterward.

## Local development

1. Copy `local.settings.example.json` to `local.settings.json`.
2. Keep `local.settings.json` untracked.
3. Sign in using `az login`; `DefaultAzureCredential` uses the developer identity locally.
4. Give that developer identity temporary table data access, or point local settings at a development table.
5. Run the Function App with `npm start` and the site through the Static Web Apps CLI so `/api` is proxied locally.

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
