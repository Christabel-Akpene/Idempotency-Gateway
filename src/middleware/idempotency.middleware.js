import {
  getKey,
  setKey,
  setKeyIfAbsent,
  deleteKey,
} from "../utils/memoryStore.js";
import { hashBody } from "../utils/hash.js";

const idempotencyMiddleware = async (req, res, next) => {
  const apiKey = req.headers["api-key"];
  const idempotencyKey = req.headers["idempotency-key"];
  const key = `${apiKey}:${idempotencyKey}`;

  if (!idempotencyKey) {
    return res
      .status(400)
      .json({ message: "Idempotency key header is required" });
  }

  const hashedBody = hashBody(req.body);

  // prevent race conditions when 2 requests arrive at same time
  let resolvePromise;
  let rejectPromise;

  const sharedPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  // prevent unhandled promise rejection errors
  sharedPromise.catch(() => {});

  // reserve idempotency key. If another request uses the same key, send back the existing result instead of processing it again
  const claimedKey = await setKeyIfAbsent(key, { status: "in-flight", hash: hashedBody, promise: sharedPromise}, 30)

  if (!claimedKey) {
    const existingKey = await getKey(key);

    // the previous in-flight request may have failed or expired before completion, retry again.
    if (!existingKey) {
      return res
        .status(409)
        .json({
          message:
            "Previous attempt with this idempotency key failed. Please try again.",
        });
    }

    // prevent using the same key with a different body
    if (existingKey.hash !== hashedBody) {
      return res.status(409).json({
        message: "Idempotency key already used for a different request body.",
      });
    }

    if (existingKey.status === "in-flight") {
      try {
        const result = await existingKey.promise;
        return res
          .status(result.statusCode)
          .set("X-Cache-Hit", "true")
          .json(result.response);
      } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
      }
    }

    // return same results with same key and same body
    return res.status(existingKey.statusCode).set("X-Cache-Hit", "true").json(existingKey.response);
  }

  // save original res.json so that response can be sent later
  const originalResponse = res.json.bind(res);

  // save sucessful responses so that duplicate requests can reuse them
  const saveResponse = async (body) => {
    if (!res.headersSent && res.statusCode < 400) {
      const entry = {
        status: "complete",
        hash: hashedBody,
        statusCode: res.statusCode,
        response: body,
      };
      await setKey(key, entry);
      // resolve shared promise so waiting requests receive the same result
      resolvePromise(entry);
    } else if (!res.headersSent && res.statusCode >= 400) {
    // request failed. Remove the stored key and notify waiting requests the response failed
      await deleteKey(key);
      rejectPromise(new Error("Request failed"));
    }
  };

  // override res.json to intercept response before it's sent
  res.json = (body) => {
    saveResponse(body).catch(console.error);
    return originalResponse(body);
  };

  next();
};

export default idempotencyMiddleware;
