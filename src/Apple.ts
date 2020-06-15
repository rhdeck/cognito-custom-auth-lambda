import jwksClient from "jwks-rsa";
import { promisify } from "util";
import { verify as verifyRaw } from "jsonwebtoken";
import decode from "jwt-decode";
import ms from "ms";
const key = "APPLE";
const verifyToken = promisify(verifyRaw);
const client = jwksClient({
  cache: true, // Default Value
  cacheMaxEntries: 5, // Default value
  cacheMaxAge: ms("10m"), // Default value
  jwksUri: "https://appleid.apple.com/auth/keys",
});
const getSigningKey = (kid: string): Promise<jwksClient.SigningKey> =>
  new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
const create = async (event) => {
  const response = {
    challengeMetadata: JSON.stringify({ authType: key }),
    publicChallengeParameters: {
      format: "jwt",
      authType: key,
    },
    privateChallengeParameters: {
      format: "jwt",
      authType: key,
    },
  };
  return { ...event, response };
};
const verify = async (event) => {
  let answerCorrect = false;
  const {
    request: {
      challengeAnswer: idToken,
      userAttributes: {
        email: cognitoEmail,
        preferred_username: cognitoUsername,
      },
    },
  } = event;
  const decoded = decode(idToken);
  const { email, sub } = decoded;
  const decodedHeader = decode(idToken, { header: true });
  const { kid } = decodedHeader;
  const key = await getSigningKey(kid);
  const verified = await verifyToken(idToken, key.getPublicKey());
  if (verified && (email === cognitoEmail || sub === cognitoUsername))
    answerCorrect = true;
  return { ...event, response: { answerCorrect } };
};
export default (): Authenticator => ({ key, create, verify });
