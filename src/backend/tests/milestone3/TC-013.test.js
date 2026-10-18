// PED transitions remain the oracle even when implementation differs.
jest.mock("../../modules/request/repository", () => ({
  findRequestById: jest.fn(),
  addTimelineAction: jest.fn(),
}));
const repo = require("../../modules/request/repository");
const service = require("../../modules/request/service");

beforeEach(() => {
  jest.clearAllMocks();
});

test.each([
  ["Pending", "Accepted"],
  ["Accepted", "In Progress"],
  ["In Progress", "Completed"],
  ["Pending", "Cancelled"],
  ["Completed", "In Progress"],
])("TC-013 allows %s to %s", async (from, to) => {
  repo.findRequestById
    .mockResolvedValueOnce({ request_id: 1, status: from })
    .mockResolvedValueOnce({ request_id: 1, status: to });

  // Provide mocked return value to avoid undefined destructuring inside the service
  repo.addTimelineAction.mockResolvedValueOnce({ action_id: 1 });

  const result = await service.updateRequestStatus(1, 101, { new_status: to });
  expect(result.status).toBe(to);
  expect(repo.addTimelineAction).toHaveBeenCalledWith(
    expect.objectContaining({ newStatus: to }),
  );
});

test.each([
  ["Pending", "Completed"],
  ["Cancelled", "In Progress"],
  ["Pending", "Unknown"],
])("TC-013 rejects %s to %s without writing", async (from, to) => {
  repo.findRequestById.mockResolvedValue({ request_id: 1, status: from });
  await expect(
    service.updateRequestStatus(1, 101, { new_status: to }),
  ).rejects.toMatchObject({ status: 409 });
  expect(repo.addTimelineAction).not.toHaveBeenCalled();
});
