const mockUsers = [];
const mockVerificationTokens = [];

const createUser = async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUserId = mockUsers.length + 1;

      const newUser = {
        user_id: newUserId,
        name: userData.name,
        email: userData.email,
        password_hash: userData.password_hash,
        email_verified: false,
      };

      const newVerificationToken = {
        token_id: mockVerificationTokens.length + 1,
        user_id: newUserId,
        token_hash: userData.token_hash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
      };

      mockUsers.push(newUser);
      mockVerificationTokens.push(newVerificationToken);

      resolve({
        user_id: newUserId,
        email: newUser.email,
        email_verified: newUser.email_verified,
      });
    }, 100);
  });
};

const findUserByEmail = async (email) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockUsers.find((user) => user.email === email));
    }, 100);
  });
};

// Add these below your existing createUser and findUserByEmail functions:

const findTokenByHash = async (tokenHash) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockVerificationTokens.find((t) => t.token_hash === tokenHash));
    }, 100);
  });
};

const markUserVerified = async (userId, tokenId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 1. Mark user as verified
      const user = mockUsers.find((u) => u.user_id === userId);
      if (user) user.email_verified = true;

      // 2. Mark token as used so it cannot be reused
      const token = mockVerificationTokens.find((t) => t.token_id === tokenId);
      if (token) token.used_at = new Date().toISOString();

      resolve(true);
    }, 100);
  });
};

module.exports = {
  createUser,
  findUserByEmail,
  findTokenByHash,
  markUserVerified,
};
