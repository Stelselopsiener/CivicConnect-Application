const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "milestone3-test-only-secret";

jest.mock("../../modules/admin/repository", () => ({
  findAllUsers: jest.fn(),
  updateUserType: jest.fn(),
}));
jest.mock("../../modules/staff/repository", () => ({
  assignRequest: jest.fn(),
}));
jest.mock("../../modules/request/repository", () => ({
  findRequestById: jest.fn(),
  addTimelineAction: jest.fn(),
}));

const adminRepo = require("../../modules/admin/repository");
const requestRepo = require("../../modules/request/repository");
const staffRepo = require("../../modules/staff/repository");

const app = express();
app.use(express.json());
app.use("/admin", require("../../api/adminRoutes"));
app.use("/staff", require("../../api/staffRoutes"));
app.use("/requests", require("../../api/requestRoutes"));

const token = (role) =>
  jwt.sign({ user_id: 101, user_type: role }, process.env.JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
  adminRepo.findAllUsers.mockResolvedValue([]);
  adminRepo.updateUserType.mockResolvedValue({
    user_id: 202,
    user_type: "management",
  });
  requestRepo.findRequestById.mockResolvedValue({
    request_id: 1,
    requester_id: 202,
    category_id: 2,
    status: "Pending",
  });
});

test("TC-014 unauthenticated admin access is rejected", async () => {
  await request(app).get("/admin/users").expect(401);
});

test("TC-014 requester cannot assign", async () => {
  await request(app)
    .patch("/staff/requests/1/assign")
    .set("Authorization", "Bearer " + token("requester"))
    .send({ staff_id: 202 })
    .expect(403);
  expect(staffRepo.assignRequest).not.toHaveBeenCalled();
});

test("TC-014 requester cannot change user roles", async () => {
  await request(app)
    .patch("/admin/users/202/type")
    .set("Authorization", "Bearer " + token("requester"))
    .send({ user_type: "management" })
    .expect(403);
  expect(adminRepo.updateUserType).not.toHaveBeenCalled();
});

test("TC-014 management cannot update request status", async () => {
  await request(app)
    .patch("/requests/1/status")
    .set("Authorization", "Bearer " + token("management"))
    .send({ new_status: "In Progress" })
    .expect(403);
  expect(requestRepo.addTimelineAction).not.toHaveBeenCalled();
});
