const {createUserService} = require('../../modules/user/service');
let service, repo, mailSender;
beforeEach(() => {
  repo = {createUser:jest.fn().mockResolvedValue({user_id:101}),findUserByEmail:jest.fn()};
  mailSender = {send:jest.fn().mockResolvedValue()};
  service = createUserService({repo,mailSender,bcrypt:{hash:jest.fn().mockResolvedValue('fake-hash'),compare:jest.fn().mockResolvedValue(true)},jwt:{sign:jest.fn().mockReturnValue('fake-token')},jwtSecret:'test-only',verificationSecret:'test-only-verification-secret-32-characters',logger:{info:jest.fn(),warn:jest.fn()}});
});
test('TC-016 supporting component check: registration creates an unverified user and emails a six-digit code', async () => {
  await service.registerUser({name:'Test User',email:'test@example.com',password:'Test-only-password'});
  expect(repo.createUser).toHaveBeenCalledWith(expect.objectContaining({name:'Test User',email:'test@example.com',password_hash:'fake-hash',ttlMinutes:10,token_hash:expect.stringMatching(/^[a-f0-9]{64}$/)}));
  expect(mailSender.send).toHaveBeenCalledTimes(1);
  expect(mailSender.send.mock.calls[0][0]).toMatchObject({to:'test@example.com',text:expect.stringMatching(/\b\d{6}\b/)});
});
test('TC-016 supporting component check: unverified account cannot sign in', async () => {
  repo.findUserByEmail.mockResolvedValue({user_id:101,email:'test@example.com',password_hash:'fake-hash',email_verified:false});
  await expect(service.loginUser('test@example.com','Test-only-password')).rejects.toMatchObject({status:403,code:'EMAIL_NOT_VERIFIED'});
});
test('TC-016 supporting component check: duplicate email rejected', async () => {
  repo.createUser.mockResolvedValue(null);
  await expect(service.registerUser({name:'Test User',email:'test@example.com',password:'Test-only-password'})).rejects.toMatchObject({status:409,code:'ACCOUNT_EXISTS'});
});
test.todo('TC-016 browser E2E: register, receive code, verify, login, submit, My Requests (run against the Render deployment)');
