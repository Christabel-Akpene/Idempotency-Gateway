import { Router } from "express"
import { createPayment } from "../controller/payment.controller.js"

const router = Router();

// route which handles incoming payments
router.route("/process-payment").post(createPayment);

export default router;
