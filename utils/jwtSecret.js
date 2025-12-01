const MIN_SECRET_LENGTH = Number(process.env.JWT_SECRET_MIN_LENGTH || 32);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long in production`
    );
  }
  return secret;
}

module.exports = { getJwtSecret };


