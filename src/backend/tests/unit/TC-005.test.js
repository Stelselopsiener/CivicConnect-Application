const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");

describe("TC-005: Password Length BVA", () => {
  afterAll(async () => await pool.end());

  test("Rejects passwords outside 8-64 characters", async () => {
    const shortPasswordResponse = await request(app)
      .post("/api/v1/users/register")
      .send({
        name: "Drew",
        email: `short_${Date.now()}@example.com`,
        password: "short",
      });

    const longPassword = "a".repeat(65);
    const longPasswordResponse = await request(app)
      .post("/api/v1/users/register")
      .send({
        name: "Drew",
        email: `long_${Date.now()}@example.com`,
        password: longPassword,
      });

    expect(shortPasswordResponse.status).toBe(400);
    expect(longPasswordResponse.status).toBe(400);
  });
});
