import crypto from "crypto";

const hashBody = (body) => {
    const sortedBody = Object.fromEntries(Object.entries(body).sort())
    return crypto.createHash("sha256").update(JSON.stringify(sortedBody)).digest("hex")
}

export { hashBody }