import { SNS } from "aws-sdk";
import makeContactBase from "./ContactBase";
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
) =>
  makeContactBase(key, async ({ userAttributes: { phone_number } }, code) => {
    if (code && phone_number) await sendText(phone_number, code);
  });
export default makePhone;
export { AWSSNS, Twilio };
