import { v4 as uuid } from "uuid";
const MAX_TRIES = 3;
const getAuthType = (event) => {
  const {
    request: { session, clientMetaData },
  } = event;
  if (!session.length) {
    return "FIRST";
  }
  if (session.length === 1) {
    //look at clientMetaData
    return clientMetaData.authType;
  } else {
    let { authType } = JSON.parse([...session].pop().challengeMetadata);
    return authType;
  }
};
export default (Authenticators, { maxTries = MAX_TRIES }) => {
  //compile Authenticators
  const authenticators = Authenticators.reduce(
    (o, { key, create, verify }) => ({ ...o, [key]: { create, verify } }),
    {}
  );
  const authenticatorKeys = Object.keys(authenticators);
  const FIRST = {
    create: async (event) => {
      const response = {
        challengeMetadata: { authType: "FIRST" },
        publicChallengeParameters: { authType: "challengeType", key: uuid() },
        privateChallengeParameters: { authType: "challengeType", key: uuid() },
      };
      return { ...event, response };
    },
    verify: async (event) => {
      //Look for a valid answer in the response and the
      const {
        request: { challengeResponse, clientMetaData },
      } = event;
      const response = (() => {
        if (
          clientMetaData &&
          clientMetaData.authType === challengeResponse &&
          authenticatorKeys.includes(challengeResponse)
        ) {
          return {
            challengeResult: true,
          };
        } else return { challengeResult: false };
      })();
      return { ...event, response };
    },
  };
  authenticators.FIRST = FIRST;
  const define = async (event) => {
    const { session } = event;
    //If this is the first time, just go to create challenge
    if (!session.length)
      event.response = {
        issueTokens: false,
        failAuthentication: false,
        challengeName: "CUSTOM_CHALLENGE",
      };
    //If this is a good result _after_ step 1, mark success
    if (session.length > 1 && [...session].pop().challengeResult) {
      event.response = { issueTokens: true, failAuthentication: false };
    }
    //If this is a bad result _at_ step 1, fail
    if (session.length === 1 && ![...session].pop().challengeResult) {
      event.response = { issueTokens: false, failAuthentication: true };
    }
    //Too many login attempts - force out
    else if (session.length > MAX_TRIES)
      event.response = { issueTokens: false, failAuthentication: true };
    //Otherwise, this is an ordinary "go to next step"
    else
      event.response = {
        issueTokens: false,
        failAuthentication: false,
        challengeName: "CUSTOM_CHALLENGE",
      };
    return event;
  };
  const create = async (event) => {
    //Is this my first auth challenge? If so, just ask for which path to go down
    const authType = getAuthType(event);
    if (
      authenticators[authType] &&
      typeof authenticators[authType].create === "function"
    )
      return authenticators[authType].create(event);
    throw new Error("Cannot authenticate");
  };
  const verify = async (event) => {
    //THis is driven by my challenge metadata
    const {
      request: { challengeMetaData },
    } = event;
    const { authType } = JSON.parse(challengeMetaData);
    if (
      authenticators[authType] &&
      typeof authenticators[authType].verify === "function"
    )
      return authenticators[authType].verify(event);
    throw new Error("Cannot authenticate");
  };
  return { define, create, verify };
};
