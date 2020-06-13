import { v4 as uuid } from "uuid";
const MAX_TRIES = 3;
const getAuthType = (event) => {
  const {
    request: { session, clientMetadata },
  } = event;
  if (!session.length) {
    return "FIRST";
  }
  if (session.length === 1) {
    //look at clientMetadata
    return clientMetadata.authType;
  } else {
    let { authType } = JSON.parse([...session].pop().challengeMetadata);
    return authType;
  }
};
export default (Authenticators: Authenticator[], { maxTries = MAX_TRIES }) => {
  //compile Authenticators
  const rawAuthenticators = Authenticators.reduce(
    (o, { key, create, verify }) => ({ ...o, [key]: { create, verify } }),
    {}
  );
  const authenticatorKeys = Object.keys(rawAuthenticators);
  const FIRST: Authenticator = {
    key: "FIRST",
    create: async (event) => {
      const response = {
        challengeMetadata: JSON.stringify({ authType: "FIRST" }),
        publicChallengeParameters: { authType: "FIRST", key: uuid() },
        privateChallengeParameters: { authType: "FIRST", key: uuid() },
      };
      console.log("return response", response);
      return { ...event, response };
    },
    verify: async (event) => {
      //Look for a valid answer in the response and the
      const {
        request: { challengeAnswer, clientMetadata },
      } = event;

      const response = (() => {
        if (
          clientMetadata &&
          clientMetadata.authType === challengeAnswer &&
          authenticatorKeys.includes(challengeAnswer)
        ) {
          return {
            answerCorrect: true,
          };
        } else return { answerCorrect: false };
      })();
      return { ...event, response };
    },
  };
  const authenticators = { ...rawAuthenticators, FIRST };
  const define = async (event) => {
    console.log("Starting define with event", JSON.stringify(event, null, 2));
    const {
      request: { session },
    } = event;
    //If this is the first time, just go to create challenge
    if (!session.length) {
      console.log("This is my first time");
      event.response = {
        issueTokens: false,
        failAuthentication: false,
        challengeName: "CUSTOM_CHALLENGE",
      };
      //If this is a good result _after_ step 1, mark success
    } else if (session.length > 1 && [...session].pop().challengeResult) {
      console.log("Congratuations, everyone");
      event.response = { issueTokens: true, failAuthentication: false };
    }
    //If this is a bad result _at_ step 1, fail
    else if (session.length === 1 && ![...session].pop().challengeResult) {
      event.response = { issueTokens: false, failAuthentication: true };
    }
    //Too many login attempts - force out
    else if (session.length > MAX_TRIES)
      event.response = { issueTokens: false, failAuthentication: true };
    //Otherwise, this is an ordinary "go to next step"
    else {
      console.log("last possible result");
      event.response = {
        issueTokens: false,
        failAuthentication: false,
        challengeName: "CUSTOM_CHALLENGE",
      };
    }
    console.log(
      "Ending define with event full event",
      JSON.stringify(event, null, 2)
    );
    return event;
  };
  const create = async (event) => {
    console.log("starting create with event", JSON.stringify(event, null, 2));
    //Is this my first auth challenge? If so, just ask for which path to go down
    const authType = getAuthType(event);
    console.log("got an authtype of", authType);
    if (
      authenticators[authType] &&
      typeof authenticators[authType].create === "function"
    ) {
      console.log("Launching create with authtype", authType);
      const out = await authenticators[authType].create(event);
      console.log("Ending with event", JSON.stringify(out, null, 2));
      return out;
    }
    console.log("ruh roh", authType);
    throw new Error("Cannot authenticate");
  };
  const verify = async (event) => {
    //THis is driven by my challenge metadata
    const {
      request: {
        privateChallengeParameters: { authType },
      },
    } = event;
    console.log("Starting base verify with event", event);
    if (
      authenticators[authType] &&
      typeof authenticators[authType].verify === "function"
    ) {
      console.log("Launching verify for ", authType);
      const out = await authenticators[authType].verify(event);
      console.log("Ending base verify with event", out);
      return out;
    }
    throw new Error("Cannot authenticate");
  };
  return { define, create, verify };
};
