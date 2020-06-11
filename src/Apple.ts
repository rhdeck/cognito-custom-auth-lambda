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
    publicChallengeParameters: {
      authType: key,
      format: "jwt",
    },
    privateChallengeParameters: {
      format: "jwt",
    },
  };
  return { ...event, response };
};
const verify = async (event) => {
  let challengeResult = false;
  const {
    request: {
      challengeResponse,
      userAttributes: { email: cognitoEmail },
    },
  } = event;
  const decoded = decode(challengeResponse);
  const { email, kid } = decoded;
  const key = await getSigningKey(kid);
  const verified = await verifyToken(challengeResponse, key);
  if (verified && email === cognitoEmail) challengeResult = true;
  return { event, response: { challengeResult } };
};
export default () => ({ key, create, verify });
