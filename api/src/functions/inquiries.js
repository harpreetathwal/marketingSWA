"use strict";

const crypto = require("node:crypto");
const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");

const MAX_BODY_BYTES = 32 * 1024;
const DEFAULT_TABLE_NAME = "WebsiteSubmissions";
const ALLOWED_FORM_TYPES = new Set(["hire", "internship", "collaboration"]);
const FIELD_LIMITS = Object.freeze({
  name: 160,
  email: 320,
  company: 200,
  phone: 50,
  subject: 200,
  budget: 100,
  timeline: 120,
  portfolio: 500,
  availability: 160,
  smsConsent: 10,
  message: 5000
});
const CLIENT_METADATA_LIMITS = Object.freeze({
  pagePath: 500,
  localSubmittedAt: 80,
  timeZone: 100,
  language: 50,
  platform: 100,
  connectionType: 50
});

let tableClient;

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  };
}

function getTableClient() {
  if (tableClient) return tableClient;

  const accountName = String(process.env.AZURE_STORAGE_ACCOUNT_NAME || "").trim();
  const tableName = String(process.env.SUBMISSIONS_TABLE_NAME || DEFAULT_TABLE_NAME).trim();

  if (!/^[a-z0-9]{3,24}$/.test(accountName)) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is missing or invalid.");
  }
  if (!/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName)) {
    throw new Error("SUBMISSIONS_TABLE_NAME is invalid.");
  }

  const credential = new DefaultAzureCredential();
  tableClient = new TableClient(
    `https://${accountName}.table.core.windows.net`,
    tableName,
    credential
  );
  return tableClient;
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function getAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function originIsAllowed(request) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return !process.env.WEBSITE_HOSTNAME;
  const origin = cleanString(request.headers.get("origin"), 500).replace(/\/$/, "");
  return Boolean(origin && allowed.includes(origin));
}

function getClientIp(headers) {
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded
    ? forwarded.split(",")[0]
    : headers.get("x-azure-clientip") || headers.get("x-client-ip") || "";
  return cleanString(candidate, 128);
}

function safeHeader(headers, name, maxLength = 500) {
  return cleanString(headers.get(name), maxLength);
}

function validatePayload(payload) {
  const errors = {};
  const formType = cleanString(payload.formType, 40).toLowerCase();
  const fields = {};

  if (!ALLOWED_FORM_TYPES.has(formType)) errors.formType = "Choose a valid inquiry type.";

  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    fields[field] = cleanString(payload[field], limit);
  }
  fields.smsConsent = fields.smsConsent.toLowerCase() === "yes" ? "yes" : "";

  if (!fields.name) errors.name = "Your name is required.";
  if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.message || fields.message.length < 10) {
    errors.message = "Please include at least 10 characters.";
  }
  if (fields.portfolio && !/^https?:\/\//i.test(fields.portfolio)) {
    errors.portfolio = "Portfolio links must begin with http:// or https://.";
  }

  const clientMetadata = {};
  const suppliedMetadata = payload.clientMetadata && typeof payload.clientMetadata === "object"
    ? payload.clientMetadata
    : {};

  for (const [field, limit] of Object.entries(CLIENT_METADATA_LIMITS)) {
    clientMetadata[field] = cleanString(suppliedMetadata[field], limit);
  }

  for (const numericField of ["screenWidth", "screenHeight", "viewportWidth", "viewportHeight", "colorDepth", "pixelRatio", "touchPoints", "timezoneOffsetMinutes"]) {
    const number = Number(suppliedMetadata[numericField]);
    if (Number.isFinite(number)) clientMetadata[numericField] = number;
  }

  return { formType, fields, clientMetadata, errors };
}

function buildEntity(request, context, validated) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7).replace("-", "");
  const headers = request.headers;
  const requestUrl = new URL(request.url);

  return {
    partitionKey: `${validated.formType}-${month}`,
    rowKey: crypto.randomUUID(),
    submittedAtUtc: now,
    submittedAtIso: now.toISOString(),
    submissionType: validated.formType,
    ...validated.fields,
    ...Object.fromEntries(
      Object.entries(validated.clientMetadata).map(([key, value]) => [`client_${key}`, value])
    ),
    clientIp: getClientIp(headers),
    userAgent: safeHeader(headers, "user-agent", 1000),
    acceptLanguage: safeHeader(headers, "accept-language", 300),
    origin: safeHeader(headers, "origin", 500),
    referrer: safeHeader(headers, "referer", 1000),
    forwardedHost: safeHeader(headers, "x-forwarded-host", 300),
    forwardedProto: safeHeader(headers, "x-forwarded-proto", 30),
    requestHost: requestUrl.host.slice(0, 300),
    requestPath: requestUrl.pathname.slice(0, 500),
    requestId: cleanString(context.invocationId, 100),
    contentLength: Number(headers.get("content-length")) || 0
  };
}

async function inquiriesHandler(request, context) {
    if (!originIsAllowed(request)) {
      return jsonResponse(403, { ok: false, message: "This request origin is not allowed." });
    }

    let rawBody;
    try {
      rawBody = await request.text();
    } catch {
      return jsonResponse(400, { ok: false, message: "The request body could not be read." });
    }

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return jsonResponse(413, { ok: false, message: "The submission is too large." });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse(400, { ok: false, message: "Send a valid JSON submission." });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonResponse(400, { ok: false, message: "Send a valid submission object." });
    }

    // Bots commonly fill hidden fields. Return a neutral success response without storing spam.
    if (cleanString(payload.website, 500)) {
      return jsonResponse(202, { ok: true, submissionId: crypto.randomUUID() });
    }

    const validated = validatePayload(payload);
    if (Object.keys(validated.errors).length > 0) {
      return jsonResponse(422, {
        ok: false,
        message: "Please correct the highlighted fields.",
        errors: validated.errors
      });
    }

    const entity = buildEntity(request, context, validated);

    try {
      await getTableClient().createEntity(entity);
      context.log("Website inquiry stored", {
        submissionId: entity.rowKey,
        submissionType: entity.submissionType
      });
      return jsonResponse(201, {
        ok: true,
        submissionId: entity.rowKey,
        submittedAtUtc: entity.submittedAtIso
      });
    } catch (error) {
      context.error("Website inquiry storage failed", {
        errorName: cleanString(error && error.name, 100),
        statusCode: Number(error && error.statusCode) || 0,
        requestId: entity.requestId
      });
      return jsonResponse(503, {
        ok: false,
        message: "The inquiry could not be saved right now. Please try again shortly."
      });
    }
}

app.http("inquiries", {
  route: "inquiries",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: inquiriesHandler
});

module.exports = {
  inquiriesHandler,
  validatePayload,
  buildEntity
};
