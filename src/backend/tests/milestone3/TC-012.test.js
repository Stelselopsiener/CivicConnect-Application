// Component tests: real service, mocked persistence. No database writes.
jest.mock('../../modules/request/repository', () => ({ createRequest: jest.fn() }));
const repo = require('../../modules/request/repository');
const service = require('../../modules/request/service');
const data = category => ({ title: 'Test', description: 'Test description', street_address: 'Test address', category, requester_id: 101 });
beforeEach(() => repo.createRequest.mockResolvedValue({ request_id: 1 }));
test.each(['', undefined, null, ' ', 'Not a category'])('TC-012 rejects category %p without creating a request', async category => {
  await expect(service.submitRequest(data(category))).rejects.toThrow();
  expect(repo.createRequest).not.toHaveBeenCalled();
});
test('TC-012 valid category control', async () => {
  await service.submitRequest(data('IT support'));
  expect(repo.createRequest).toHaveBeenCalledWith(expect.objectContaining({category_id: 4}));
});
