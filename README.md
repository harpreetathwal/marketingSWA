# Marketing Static Web App

Pure HTML, CSS, and JavaScript front end deployed with Azure Static Web Apps.

- `index.html`: animated landing page
- `gallery.html`: media gallery backed by Azure Blob Storage
- `hire.html`, `internship.html`, and `contact.html`: inquiry forms
- `api/`: separately deployed Node.js Azure Function App that stores submissions in Azure Table Storage using managed identity

See [`api/README.md`](api/README.md) for secure Azure provisioning and linking instructions.
