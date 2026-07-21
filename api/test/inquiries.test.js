"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { inquiriesHandler, validatePayload, buildEntity } = require("../src/functions/inquiries");

function request(body, origin = "https://example.com", extraHeaders = {}) {
  return {
    url: "https://api.example.com/api/inquiries",
    headers: new Headers({
      origin,
      "content-type": "application/json",
      "user-agent": "Submission API test",
      "x-forwarded-for": "203.0.113.42, 10.0.0.1",
      ...extraHeaders
    }),
    text: async () => body
  };
}

const context = {
  invocationId: "test-invocation",
  log() {},
  error() {}
};

test.before(() => {
  process.env.ALLOWED_ORIGINS = "https://example.com";
});

test("validates expected form fields", () => {
  const valid = validatePayload({
    formType: "hire",
    name: "A User",
    email: "user@example.com",
    message: "A sufficiently detailed project message."
  });
  assert.deepEqual(valid.errors, {});

  const invalid = validatePayload({ formType: "other", name: "", email: "bad", message: "x" });
  assert.deepEqual(Object.keys(invalid.errors).sort(), ["email", "formType", "message", "name"]);
});

test("rejects an origin outside the allowlist", async () => {
  const response = await inquiriesHandler(request("{}", "https://attacker.example"), context);
  assert.equal(response.status, 403);
});

test("rejects invalid JSON", async () => {
  const response = await inquiriesHandler(request("not json"), context);
  assert.equal(response.status, 400);
});

test("does not store honeypot submissions", async () => {
  const response = await inquiriesHandler(request(JSON.stringify({ website: "spam.example" })), context);
  assert.equal(response.status, 202);
  assert.equal(response.jsonBody.ok, true);
});

test("returns field errors before attempting storage", async () => {
  const response = await inquiriesHandler(request(JSON.stringify({ formType: "hire" })), context);
  assert.equal(response.status, 422);
  assert.equal(response.jsonBody.ok, false);
});

test("builds a typed entity with server and client metadata", () => {
  const validated = validatePayload({
    formType: "internship",
    name: "A User",
    email: "user@example.com",
    phone: "+1 555 010 0200",
    smsConsent: "yes",
    message: "I would like to learn through real project work.",
    clientMetadata: { timeZone: "America/Los_Angeles", viewportWidth: 1440 }
  });
  const entity = buildEntity(request("{}"), context, validated);

  assert.match(entity.partitionKey, /^internship-\d{6}$/);
  assert.match(entity.rowKey, /^[0-9a-f-]{36}$/);
  assert.ok(entity.submittedAtUtc instanceof Date);
  assert.equal(entity.clientIp, "203.0.113.42");
  assert.equal(entity.phone, "+1 555 010 0200");
  assert.equal(entity.smsConsent, "yes");
  assert.equal(entity.client_timeZone, "America/Los_Angeles");
  assert.equal(entity.client_viewportWidth, 1440);
});
