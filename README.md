# Idempotency Gateway (The Pay-Once Protocol)
This is a middleware service which ensures that apayment is processed exactly once no matter how many times a client sends the same request.
Client sends a unique `Idempotency-Key` header with each payment. The first request is processed and response saved in a redis database, subsequent requests with the same header return the same results.

## Architecture Diagram
![Flowchart](./flowchart.png)

## Setup
Create a free Upstash Redis account at (https://console.upstash.com)

```bash
git clone https://github.com/Christabel-Akpene/Idempotency-Gateway.git
cd Idempotency-Gateway
pnpm install
pnpm start
```

### Environment Variables
Create a `.env` file in the root directory
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
API_KEY=
PORT=3000
```

## API Documentation

### `POST /process-payment`

| Header | Description |
|---|---|
| `Content-Type: application/json` | Body must be JSON |
| `api-key` | Must match `API_KEY` from `.env` |
| `Idempotency-Key` | A unique string identifying the transaction|

Body: `{"amount": 100, "currency": "GHS"}`

### Example Requests
 
#### 1. New Payment
 
**Request:**
```http
POST /process-payment
Content-Type: application/json
Idempotency-Key: test-key-001
Api-Key: <your-api-key>
 
{
  "amount": 100,
  "currency": "GHS"
}
```
 
**Response:** `201 Created`
```json
{
  "message": "Charged 100 GHS"
}
```
 
 
#### 2. Duplicate Request (Same Key, Same Body)
 
**Response:** `201 Created`
```http
X-Cache-Hit: true
```
```json
{
  "message": "Charged 100 GHS"
}
```
 
#### 3. Same Key, Different Body
 
**Response:** `409 Conflict`
```json
{
  "message": "Idempotency key already used for a different request body."
}
```
  
#### 4. Missing Idempotency Key
 
**Response:** `400 Bad Request`
```json
{
  "message": "Idempotency-Key header is required"
}
```

#### 5. Missing or Incorrect Api-key
 
 
**Response:** `401 Unauthorized`
```json
{
  "message": "You are unauthorised. A valid api key is required."
}
```


## Design Decisions

- **Atomic key claim (`SET NX`)** 
When a request arrives, the middleware attempts to claim the idempotency key in redis using `SET NX EX`. If multiple identical requests arrive together, only one creates the key and the others are seen as duplicates.
- **Request bodies are compared by SHA-256 hash** 
The requests are hashed so that the requests can be compared. If a client uses the same idempotency key with a different amount/currency, the hash detects this and request is rejected.
- **In-flight claims expire after 30 seconds; completed responses after 24 hours.** "In-Flight" entries expire in 30 seconds so that a crashed request won't block retries. The completed requests are stored for 24 hours so that retries can send a response when the key is used.

- **A failed request never crashes the gateway.** 
If payment processing fails, the idempotency key is deleted rather than cached. The client can retry with the same Idempotency-Key when the issue is resolved.

## Developer's Choice: API-key authentication with per-client keys

Every request must present an `api-key` header matching the configured `API_KEY`. This allows only verified clients to access the system and prevents clients from interfering with each other.
