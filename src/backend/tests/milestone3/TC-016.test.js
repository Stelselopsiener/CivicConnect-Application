const {createUserService} = require('../../modules/user/service');
let service, repo, mailSender;
beforeEach(() => {
  repo = {createUser:jest.fn().mockResolvedValue({user_id:101}),findUserByEmail:jest.fn()};
  mailSender = {send:jest.fn()};
  service = createUserService({repo,mailSender,bcrypt:{hash:jest.fn().mockResolvedValue('fake-hash'),compare:jest.fn().mockResolvedValue(true)},jwt:{sign:jest.fn().mockReturnValue('fake-token')},jwtSecret:'test-only'});
});
test('TC-016-R supporting component check: current registration sends no verification email', async () => {
  await service.registerUser({name:'Test User',email:'test@example.com',password:'Test-only-password'});
  expect(repo.createUser).toHaveBeenCalledWith({name:'Test User',email:'test@example.com',password_hash:'fake-hash'});
  expect(mailSender.send).not.toHaveBeenCalled();
});
test('TC-016-R supporting component check: duplicate email rejected', async () => {
  repo.createUser.mockResolvedValue(null);
  await expect(service.registerUser({name:'Test User',email:'test@example.com',password:'Test-only-password'})).rejects.toMatchObject({status:409,code:'ACCOUNT_EXISTS'});
});
test.todo('TC-016 original browser E2E: register, receive code, verify, login, submit, My Requests (deferred)');
test.todo('TC-016-R revised browser E2E without verification: follow practical guide; scope approval required');
