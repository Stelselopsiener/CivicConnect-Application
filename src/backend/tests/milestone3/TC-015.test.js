const {createUserService} = require('../../modules/user/service');
let service, repo;
beforeEach(() => {
  repo = {consumeVerificationCode:jest.fn()};
  service = createUserService({repo,mailSender:{send:jest.fn()},bcrypt:{},jwt:{},jwtSecret:'test-only',verificationSecret:'test-only-verification-secret-32-characters'});
});
test.each(['12345','1234567','12a456'])('TC-015 retained service rejects malformed code %s', async code => {
  await expect(service.verifyEmail({email:'test@example.com',code})).rejects.toMatchObject({status:400});
  expect(repo.consumeVerificationCode).not.toHaveBeenCalled();
});
test.todo('TC-015 database integration: successful code sets email_verified=true');
test.todo('TC-015 database integration: consumed code cannot be reused');
// Passing format checks do not make the deferred verification feature complete.
