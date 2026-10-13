const request = require("supertest");
const app = require("../../server");
const pool = require("../../config/db");
const jwt = require("jsonwebtoken");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "test-secret");

describe("TC-007: Staff Jurisdiction Filtering", () => {
  afterAll(async () => await pool.end());

  test("Returns only requests that match the staff member's assigned category", async () => {
    const staffCategory = "IT support";
    const staffToken = generateToken({
      user_id: 3,
      user_type: "staff",
      category: staffCategory,
    });

    const response = await request(app)
      .get("/api/v1/staff/requests")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);

    const requests = response.body.data;
    if (requests && requests.length > 0) {
      requests.forEach((req) => {
        expect(req.category).toBe(staffCategory);
      });
    }
  });
});
