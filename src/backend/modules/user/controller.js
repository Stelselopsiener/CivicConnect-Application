function createUserController(service, logger = console) {
  const handle = (operation, status = 200) => async (req, res) => {
    try { res.status(status).json(await operation(req.body || {})); }
    catch (error) {
      const status = error.status || 500;
      if (status >= 500) {
        // SQLSTATE/error category only: no query, credentials, recipient or provider message.
        const code = typeof error.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : 'UNKNOWN';
        logger.error?.(`AUTH_REQUEST_FAILED (${code}): inspect the database schema, defaults and constraints.`);
      }
      res.status(status).json({ error: {
        code: error.code && error.status ? error.code : 'INTERNAL_ERROR',
        message: error.status ? error.message : 'The request could not be completed. Please try again.',
      } });
    }
  };
  return {
    handleRegisterUser: handle((body) => service.registerUser(body), 201),
    handleLoginUser: handle(async (body) => ({ data: await service.loginUser(body.email, body.password) })),
    handleVerifyEmail: handle((body) => service.verifyEmail(body)),
    handleResendVerification: handle((body) => service.resendVerification(body.email)),
  };
}
module.exports = { createUserController };
