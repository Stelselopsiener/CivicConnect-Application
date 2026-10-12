/**
 * Auth gateway: the User-module endpoints of PED §12.2 and §11.3 (D13 email confirmation).
 *
 *   POST /auth/register             { name, email, password }  -> 201, generic "check your email"
 *   POST /auth/verify-email         { token }                  -> 200
 *   POST /auth/resend-verification  { email }                  -> 200, generic
 *   POST /auth/login                { email, password }        -> 200 { token, user? }
 *                                                                 401 INVALID_CREDENTIALS
 *                                                                 403 EMAIL_NOT_VERIFIED
 *
 * Written once against a `transport` (Strategy): the same code runs on HTTP and on demo data.
 */
import { toSessionUser } from "./adapters/userAdapter";
import { AppError, ERROR_CODE } from "./AppError";
import { clearToken, decodeJwt, readSession, saveToken } from "./session";

export function createAuthGateway(transport) {
  return {
    async register({ name, email, password }) {
      // Updated to match your backend User route
      return transport.post("/users/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    },

    async verifyEmail(token) {
      // Updated to match your backend User route
      return transport.post("/users/verify", { token });
    },

    async resendVerification(email) {
      // Placeholder: haven't built this in the backend yet, but we will leave it for later
      return transport.post("/users/resend-verification", {
        email: email.trim().toLowerCase(),
      });
    },

    async signIn({ email, password }) {
      // Updated to match backend User route
      const body = await transport.post("/users/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      // Extract from the PED-compliant 'data' envelope your controller sends
      const payload = body?.data;

      const user = toSessionUser(
        payload?.user,
        decodeJwt(payload?.token ?? ""),
      );

      // Removed the 'user?.role' check since we haven't added roles to our JWT yet
      if (!payload?.token) {
        throw new AppError({
          code: ERROR_CODE.UNAUTHENTICATED,
          message: "Sign-in did not return a valid session.",
        });
      }

      saveToken(payload.token);
      return user;
    },

    currentUser() {
      return toSessionUser(null, readSession());
    },

    signOut() {
      clearToken();
    },
  };
}
