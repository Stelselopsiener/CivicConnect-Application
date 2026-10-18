// const { describe, it, expect } = require("@jest/globals");
// const request = require("supertest");
// const jwt = require("jsonwebtoken");

// jest.mock("../../config/db", () => {
//   const requests = [];
//   const actions = [];

//   const categoryDays = { 1: 7, 2: 10, 3: 2, 4: 3, 5: 7, 6: 14, 7: 10 };
//   const statusNames = {
//     1: "Pending",
//     2: "In Progress",
//     3: "Accepted",
//     4: "Rejected",
//     5: "Completed",
//     6: "Cancelled",
//     7: "Closed",
//   };

//   const query = async (sql, params = []) => {
//     const text = String(sql);

//     if (/SELECT.*FROM category/i.test(text)) {
//       const name = String(params[0] || "").toLowerCase();
//       const mapping = {
//         "facility fault": 1,
//         "equipment damage": 2,
//         "security concern": 3,
//         "it support": 4,
//         maintenance: 5,
//         "lost property": 6,
//         other: 7,
//       };
//       const catId = mapping[name] || 4;
//       return {
//         rows: [
//           {
//             category_id: catId,
//             name: params[0] || "IT support",
//             target_days: categoryDays[catId],
//           },
//         ],
//       };
//     }

//     if (/INSERT INTO service_request/i.test(text)) {
//       const cat = params[1] || 4;
//       const start = new Date();
//       const end = new Date(start);
//       end.setDate(end.getDate() + (categoryDays[cat] || 10));

//       const row = {
//         service_request_id: requests.length + 1,
//         requester_id: params[0],
//         category_id: cat,
//         title: params[2],
//         description: params[3],
//         street_address: params[4],
//         start_date: start.toISOString(),
//         end_date: end.toISOString(),
//       };
//       requests.push(row);
//       return {
//         rows: [
//           {
//             service_request_id: row.service_request_id,
//             start_date: row.start_date,
//             end_date: row.end_date,
//           },
//         ],
//       };
//     }

//     if (/INSERT INTO action/i.test(text)) {
//       actions.push({
//         service_request_id: params[0],
//         performed_by: params[1],
//         status_id: params[2],
//         action_type_id: params[3],
//         date: new Date().toISOString(),
//         action_id: actions.length + 1,
//       });
//       return { rows: [] };
//     }

//     if (/WHERE .*requester_id = \$1/i.test(text)) {
//       return {
//         rows: requests
//           .filter((r) => r.requester_id === params[0])
//           .map((r) => {
//             const latest = actions
//               .filter((a) => a.service_request_id === r.service_request_id)
//               .pop();
//             const statusName = latest
//               ? statusNames[latest.status_id] || "Pending"
//               : "Pending";
//             return { ...r, status: statusName, last_action_date: latest?.date };
//           }),
//       };
//     }

//     return { rows: [] };
//   };

//   return {
//     query,
//     connect: async () => ({ query, release: () => {} }),
//     on: () => {},
//     end: async () => {},
//   };
// });

// const app = require("../../server");

// describe("TC-011: Successful submission appears in My Requests", () => {
//   it("shows the submitted request with calculated end_date and status", async () => {
//     const token = jwt.sign(
//       { user_id: 101, user_type: "requester" },
//       process.env.JWT_SECRET,
//     );

//     const submitted = await request(app)
//       .post("/api/v1/requests")
//       .set("Authorization", `Bearer ${token}`)
//       .send({
//         title: "Computer froze",
//         description: "Freezes after login.",
//         street_address: "12 Civic Centre Road",
//         category: "IT support",
//       });

//     const myRequests = await request(app)
//       .get("/api/v1/requests/my")
//       .set("Authorization", `Bearer ${token}`);

//     expect(submitted.status).toBe(201);
//     expect(myRequests.status).toBe(200);
//     expect(myRequests.body.data).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ title: "Computer froze", status: "Pending" }),
//       ]),
//     );
//   });
// });

test.todo('TC-011 disabled: mock database regex brittle against real repository SQL (tracked in TD-008)');