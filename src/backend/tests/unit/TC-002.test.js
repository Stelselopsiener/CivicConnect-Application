const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");
const jwt = require("jsonwebtoken");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "test-secret");

describe("TC-002: Role-Based Access Isolation", () => {
  afterAll(async () => await pool.end());

  test("Blocks a requester JWT from accessing staff/admin endpoints", async () => {
    const requesterToken = generateToken({
      user_id: 1,
      user_type: "requester",
    });

    const response = await request(app)
      .get("/api/v1/staff/requests")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
