const { createUserService } = require("../../modules/user/service");
let service, repo;

beforeEach(() => {
  repo = { consumeVerificationCode: jest.fn() };
  service = createUserService({
    repo,
    mailSender: { send: jest.fn() },
    bcrypt: {},
    jwt: {},
    jwtSecret: "test-only",
    verificationSecret: "test-only-verification-secret-32-characters",
  });
});

test.each(["12345", "1234567", "12a456"])(
  "TC-015 retained service rejects malformed code %s",
  async (code) => {
    await expect(
      service.verifyEmail({ email: "test@example.com", code }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.consumeVerificationCode).not.toHaveBeenCalled();
  },
);

test("TC-015 component check: successful code sets email_verified=true", async () => {
  repo.consumeVerificationCode.mockResolvedValue(true);
  const result = await service.verifyEmail({
    email: "test@example.com",
    code: "123456",
  });
  expect(result.success).toBe(true);
  expect(repo.consumeVerificationCode).toHaveBeenCalled();
});

test("TC-015 component check: consumed or invalid code cannot be reused", async () => {
  repo.consumeVerificationCode.mockResolvedValue(false);
  await expect(
    service.verifyEmail({ email: "test@example.com", code: "123456" }),
  ).rejects.toMatchObject({ status: 400 });
});
