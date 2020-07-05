import makePasscode from "@raydeck/passcode";
const makeContactBase = (
  key: string,
  sendContact: (request, code) => Promise<void>
): Authenticator => ({
  key,
  create: async (event) => {
    const {
      request: {
        userAttributes: { email },
        session,
      },
    } = event;
    const { challengeMetadata } = [...session].pop();
    let code;
    if (challengeMetadata) {
      try {
        const { code: oldCode } = JSON.parse(challengeMetadata);
        if (oldCode) code = oldCode;
      } catch (e) {}
    }
    if (!code) {
      code = await makePasscode();
      if (code) await sendContact(code, event.request);
    }
    const response = {
      challengeMetadata: JSON.stringify({ code, authType: key }),
      publicChallengeParameters: { authType: key },
      privateChallengeParameters: { code, authType: key },
    };
    return { ...event, response };
  },
  verify: async (event) => {
    const {
      request: {
        challengeAnswer,
        privateChallengeParameters: { code },
      },
    } = event;
    if (code && challengeAnswer === code)
      return { ...event, response: { answerCorrect: true } };
    return { ...event, response: { answerCorrect: false } };
  },
});
export default makeContactBase;
