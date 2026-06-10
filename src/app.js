import express from "express";
import paymentRouter from "./routes/payment.route.js"
import idempotencyMiddleware from "./middleware/idempotency.middleware.js";
import authMiddleware from "./middleware/auth.js";

const app = express();

app.use(express.json());
app.use("/process-payment", authMiddleware)
app.use("/process-payment", idempotencyMiddleware)
app.use("/", paymentRouter)

export default app;
