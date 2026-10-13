/** PED D16: email-scoped six-digit verification, followed by normal password login. */
import { toSessionUser } from "./adapters/userAdapter";
import { AppError, ERROR_CODE } from "./AppError";
import { clearToken, decodeJwt, readSession, saveToken } from "./session";

export function createAuthGateway(transport) {
  return {
    async register({ name, email, password }) {
      // Updated to match your backend User route
      return transport.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    },

    async verifyEmail(email, code) {
      // Updated to match your backend User route
      return transport.post("/auth/verify-email", { email: email.trim().toLowerCase(), code });
    },

    async resendVerification(email) {
      return transport.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
      });
    },

    async signIn({ email, password }) {
      // Updated to match backend User route
      const body = await transport.post("/auth/login", {
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
