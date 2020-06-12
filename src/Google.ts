import { OAuth2Client } from "google-auth-library";
const key = "GOOGLE";
export default (clientId: string, clientIds?: string[]): Authenticator => ({
  key,
  create: async (event) => {
    //What I need is for them to upload their key, so just tell them to do that
    const response = {
      challengeMetadata: JSON.stringify({ authType: key }),
      publicChallengeParameters: {
        authType: key,
        format: "jwt",
      },
      privateChallengeParameters: {
        format: "jwt",
      },
    };
    return { ...event, response };
  },
  verify: async (event) => {
    const {
      request: {
        challengeAnswer: idToken,
        userAttributes: { email },
      },
    } = event;
    const client = new OAuth2Client(process.env.googleClientId);
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientIds ? [clientId, ...clientIds] : clientId,
      });
      const { payload } = ticket.getAttributes();
      if (!payload) throw new Error("no payload returned");
      //check email address
      if (payload.email === email) return { ...event, answerCorrect: true };
      else throw new Error("Email mismatch");
    } catch (e) {
      return { ...event, response: { answerCorrect: false } };
    }
  },
});
