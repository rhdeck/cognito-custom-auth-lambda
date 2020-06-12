import makePasscode from "@raydeck/passcode";
import { SES } from "aws-sdk";
import { SendEmailRequest } from "aws-sdk/clients/ses";
const AWSSES = (ses = new SES()) => async (email: string, code: string) => {
  //@typescript candidate
  if (!process.env.EMAIL_FROM)
    throw "Cannot send without environment variable EMAIL_FROM";
  const params: SendEmailRequest = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "Authorization Code" },
      Body: { Text: { Data: code } },
    },
  };
  try {
    await ses.sendEmail(params).promise();
  } catch (e) {
    console.warn("Could not send text message for phone", e);
  }
  return;
};
const key = "EMAIL";
const makeEmail = (
  sendEmail: (number: string, code: string) => Promise<void> = AWSSES()
): Authenticator => ({
  key,
  create: async (event) => {
    const {
      request: {
        userAttributes: { email },
        session,
      },
    } = event;
    const { challengeMetaData } = [...session].pop();
    let code;
    if (challengeMetaData) {
      try {
        const { code: oldCode } = JSON.parse(challengeMetaData);
        if (oldCode) code = oldCode;
      } catch (e) {}
    }
    if (!code) {
      code = email && (await makePasscode());
      if (code) {
        await sendEmail(email, code);
      }
    }
    const response = {
      challengeMetadata: JSON.stringify({ code }),
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
export default makeEmail;
export { AWSSES };
