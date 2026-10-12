const request = require("supertest");
const app = require("../server");

describe("User Module API Integration Tests", () => {
  it("should successfully register a new user and return a verification token", async () => {
    const payload = {
      name: "Test User",
      email: "test@example.com",
      password: "TestPassword123!",
    };

    const response = await request(app)
      .post("/api/v1/users/register")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toHaveProperty("user_id");
    expect(response.body.data.user.email).toBe(payload.email);
    expect(response.body.data).toHaveProperty("verification_token");
  });

  it("should reject registration with missing fields", async () => {
    const response = await request(app)
      .post("/api/v1/users/register")
      .send({ name: "Incomplete User" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });
});
