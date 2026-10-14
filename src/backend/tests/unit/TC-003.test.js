const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");
const jwt = require("jsonwebtoken");
const requestRepo = require("../../modules/request/repository");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "test-secret");

describe("TC-003: Lifecycle State Transitions", () => {
  afterAll(async () => await pool.end());

  test("Rejects forbidden status transitions (Pending -> Completed)", async () => {
    // 1. Intercept the database call. This forces your service to believe
    // Request #999 exists and is "Pending", completely bypassing PostgreSQL!
    jest.spyOn(requestRepo, "findRequestById").mockResolvedValue({
      service_request_id: 999,
      status: "Pending",
      requester_id: 1,
    });

    const staffToken = generateToken({
      user_id: 10,
      user_type: "staff",
      category: "Maintenance",
    });

    // 2. Make the API call to our fake request ID
    const response = await request(app)
      .patch("/api/v1/requests/999/status")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        new_status: "Completed",
        action_type: "Status change",
        comment: "Skipping steps",
      });

    // 3. Clean up the interceptor so we don't break other tests
    jest.restoreAllMocks();

    // 4. Verify your Javascript state machine correctly locked the transition
    expect(response.status).toBe(409);

    const errorMessage =
      response.body.error?.message ||
      response.body.message ||
      response.body.error;
    expect(errorMessage).toMatch(/invalid transition/i);
  });
});
