import makePasscode from "@raydeck/passcode";
import { SNS } from "aws-sdk";
const AWSSNS = (sns = new SNS()) => async (
  PhoneNumber: string,
  Message: string
) => {
  //@typescript candidate
  const params = { Message, PhoneNumber };
  try {
    await sns.publish(params).promise();
  } catch (e) {
    console.warn("Could not send text message for phone", e);
  }
  return;
};
const Twilio = (token, sourcenumber) => async (phonenumber, message) => {};
const key = "PHONE";
const makePhone = (
  sendText: (number: string, code: string) => Promise<void> = AWSSNS()
): Authenticator => ({
  key,
  create: async (event) => {
    const {
      request: {
        userAttributes: { phone_number },
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
      code = phone_number && (await makePasscode());
      if (code) {
        await sendText(phone_number, code);
      }
    }
    const response = {
      challengeMetadata: JSON.stringify({ code, authType: key }),
      publicChallengeParameters: {
        authType: key,
      },
      privateChallengeParameters: {
        code,
        authType: key,
      },
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
export default makePhone;
export { AWSSNS, Twilio };
