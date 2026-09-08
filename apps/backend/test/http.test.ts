import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

describe("HTTP API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => await app.close());

  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });

  it("rejects dashboard routes without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/rules" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects Roblox polling without an API key", async () => {
    const res = await app.inject({ method: "GET", url: "/api/roblox/commands" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects Roblox polling with a wrong API key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/roblox/commands",
      headers: { "x-roblox-api-key": "totally-wrong-key" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts Roblox polling with the configured API key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/roblox/commands",
      headers: { "x-roblox-api-key": "dev-roblox-api-key-change-me" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("signature");
  });

  it("logs in with valid admin credentials and can then call an authenticated route", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin" },
    });
    expect(login.statusCode).toBe(200);
    const { token } = login.json();

    const rules = await app.inject({
      method: "GET",
      url: "/api/rules",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(rules.statusCode).toBe(200);
  });

  it("rejects login with wrong credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });
});
