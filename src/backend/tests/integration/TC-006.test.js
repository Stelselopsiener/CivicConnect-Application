const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");

describe("TC-006: Registration & Verification Flow", () => {
  afterAll(async () => await pool.end());

  test("Registers user and blocks sign-in until email is confirmed", async () => {
    const testEmail = `unverified_${Date.now()}@example.com`;
    const testPassword = "ValidPassword123!";

    const regResponse = await request(app)
      .post("/api/v1/users/register")
      .send({ name: "Test User", email: testEmail, password: testPassword });

    expect(regResponse.status).toBe(201);

    const loginResponse = await request(app)
      .post("/api/v1/users/login")
      .send({ email: testEmail, password: testPassword });

    expect(loginResponse.status).toBe(403);
    expect(loginResponse.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });
});
