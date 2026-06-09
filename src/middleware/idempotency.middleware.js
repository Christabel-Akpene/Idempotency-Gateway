
import { getKey, setKey } from "../utils/memoryStore.js";
import { hashBody } from "../utils/hash.js";

const idempotencyMiddleware = async (req, res, next) => {
    const key = req.headers["idempotency-key"];

    if (!key){
        return res.status(400).json({ message: "Idempotency key header is required"})
    }

    const hashedBody = hashBody(req.body);
    const existingKey = getKey(key);

    if (existingKey){
        if (existingKey.hash !== hashedBody){
            return res.status(409).json({ message: "Idempotency key already used for a different request body."})
        }
        return res.status(existingKey.statusCode).set("X-Cache-Hit", "true").json(existingKey.response)
    }

    const originalResponse = res.json.bind(res);
    res.json = ( body ) => {
        if (res.statusCode < 400){
            setKey(key, {
                hash: hashedBody,
                statusCode: res.statusCode,
                response: body
            })
        }
        return originalResponse(body)
    }
    next();
}

export default idempotencyMiddleware;