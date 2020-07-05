import { SES } from "aws-sdk";
import { SendEmailRequest } from "aws-sdk/clients/ses";
import makeContactBase from "./ContactBase";
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
) =>
  makeContactBase(key, async ({ userAttributes: { email } }, code) => {
    if (code && email) await sendEmail(email, code);
  });
export default makeEmail;
export { AWSSES };
