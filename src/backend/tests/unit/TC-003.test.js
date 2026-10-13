const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");
const jwt = require("jsonwebtoken");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "test-secret");

describe("TC-003: Lifecycle State Transitions", () => {
  afterAll(async () => await pool.end());

  test("Rejects forbidden status transitions (Pending -> Completed)", async () => {
    const staffToken = generateToken({
      user_id: 10,
      user_type: "staff",
      category: "Maintenance",
    });

    // Using request ID 26 which exists in your database
    const response = await request(app)
      .patch("/api/v1/requests/26/status")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        new_status: "Completed",
        action_type: "Status change",
        comment: "Skipping steps",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/invalid transition/i);
  });
});
