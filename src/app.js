import express from "express";
import paymentRouter from "./routes/payment.route.js"

const app = express();

app.use(express.json());
app.use("/", paymentRouter)

export default app;
