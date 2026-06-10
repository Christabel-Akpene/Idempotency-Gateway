
import { getKey, setKey, deleteKey } from "../utils/memoryStore.js";
import { hashBody } from "../utils/hash.js";

const pendingRequests = new Map();

const idempotencyMiddleware = async (req, res, next) => {
    const key = req.headers["idempotency-key"];

    if (!key){
        return res.status(400).json({ message: "Idempotency key header is required"})
    }

    const hashedBody = hashBody(req.body);
    const existingKey = await getKey(key);

    if (existingKey){
        // prevent 2 requests from arriving at the same thing
        if (existingKey.status === "in-flight"){
            try {
                const result = await existingKey.promise;
                return res.status(result.statusCode).set("X-Cache-Hit", "true").json(result.response)
            }
            catch (error){
                return res.status(500).json({ message: "Internal server error"})
            }
        }
        // prevent using the same key with a different body
        if (existingKey.hash !== hashedBody){
            return res.status(409).json({ message: "Idempotency key already used for a different request body."})
        }

        // return same results with same key and same body
        return res.status(existingKey.statusCode).set("X-Cache-Hit", "true").json(existingKey.response)
    }

    // prevent race conditions when 2 requests arrive at same time
    let resolvePromise;
    let rejectPromise; 

    const sharedPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    })

    await setKey(key, { status: "in-flight", hash:hashedBody, promise: sharedPromise})
    const originalResponse = res.json.bind(res);

    const saveResponse = async (body) => {
        if (!res.headersSent && res.statusCode < 400){
            const entry = {
                status: "complete",
                hash: hashedBody,
                statusCode: res.statusCode,
                response: body,
            }
        await setKey(key, entry);
        resolvePromise(entry);
        }
        else if (!res.headersSent && res.statusCode >= 400){
            await deleteKey(key);
            rejectPromise(new Error("Request failed"))
        }

    }

    res.json = ( body ) => {
        saveResponse(body);
        return originalResponse(body)
    }
    next();
}

export default idempotencyMiddleware;