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

    const errorMessage =
      response.body.error?.message ||
      response.body.message ||
      response.body.error;
    expect(errorMessage).toMatch(/invalid transition/i);
  });
});