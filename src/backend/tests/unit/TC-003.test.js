const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");
const jwt = require("jsonwebtoken");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "test-secret");

describe("TC-003: Lifecycle State Transitions", () => {
  afterAll(async () => await pool.end());

  test("Rejects forbidden status transitions (Pending -> Completed)", async () => {
    // 1. Create a client token to create the request
    const clientToken = generateToken({
      user_id: 1,
      user_type: "client",
    });

    // Create a new request (defaults to Pending)
    const createResponse = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        title: "Test Transition Request",
        description: "Created for testing lifecycle transitions",
        category: "Maintenance",
      });

    const requestId = createResponse.body.id || createResponse.body.data?.id;

    // Generate staff token for updating the status
    const staffToken = generateToken({
      user_id: 10,
      user_type: "staff",
      category: "Maintenance",
    });

    // 2. Use the dynamic request ID in PATCH to test the illegal jump
    const response = await request(app)
      .patch(`/api/v1/requests/${requestId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        new_status: "Completed",
        action_type: "Status change",
        comment: "Skipping steps",
      });

    // 3. Expect 409 and message matching /invalid transition/i
    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/invalid transition/i);
  });
});