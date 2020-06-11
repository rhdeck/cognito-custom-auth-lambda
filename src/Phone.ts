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
) => ({
  key,
  create: async (event) => {
    const {
      request: {
        userAttributes: { phoneNumber },
      },
    } = event;
    const code = phoneNumber && (await makePasscode());
    if (code) await sendText(phoneNumber, code);
    const response = {
      publicChallengeParameters: {
        authType: key,
      },
      privateChallengeParameters: {
        code,
      },
    };
    return { ...event, response };
  },
  verify: async (event) => {
    const {
      request: {
        challengeResponse,
        privateChallengeParameters: { code },
      },
    } = event;
    if (code && challengeResponse === code)
      return { ...event, answerCorrect: true };
    return { ...event, answerCorrect: false };
  },
});
export default makePhone;
export { SNS, Twilio };
