import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});


const pendingPromises = new Map();
// get key stored in redis 
const getKey = async (key) => {
    const data = await redis.get(key);
    if (!data) {
        return null;
    }

    if (data.status === "in-flight" && pendingPromises.has(key)){
        data.promise = pendingPromises.get(key);
    }

    return data;
}

// set key in redis set it for 24 hours and delete the key
const setKey = async (key, values, ttlSeconds = 86400) => {
    const { promise, ...rest } = values;
    if (promise){
        pendingPromises.set(key, promise);
    }
    await redis.set(key, rest, { ex: ttlSeconds})
}

// set the key only if it doesn't already exist so two simultaneous requests won't have same key
const setKeyIfAbsent = async (key, values, ttlSeconds = 84000) => {
    const { promise, ...rest } = values;
    const claimedKey = await redis.set(key, rest, { nx: true, ex: ttlSeconds}) === "OK";
    if (claimedKey && promise ){
        pendingPromises.set(key, promise);
    }
    return claimedKey;
}


// delete key 
const deleteKey = async (key) => {
    pendingPromises.delete(key);
    await redis.del(key);
}

export { getKey, setKey, setKeyIfAbsent, deleteKey }