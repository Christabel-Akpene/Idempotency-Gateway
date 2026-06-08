
// add payment controller which handles payment requests
const createPayment = async ( req, res ) => {
    try {
        // validate the amount and currency
        const { amount, currency } = req.body;
        if (amount === undefined){
            return res.status(400).json({ message: "Amount is required"})
        }
        if (isNaN(Number(amount))){
            return res.status(400).json({
                message: "Amount must be a number"
            })
        }
        if (!currency){
            return res.status(400).json({
                message: "Currency is required"
            })
        }

        // simulate 2 second delay
        await new Promise(resolve => {
            return (
                setTimeout(resolve, 2000)
            )
        })
        res.status(201).json({ message: `Charged ${amount} ${currency}` })

    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

export { createPayment }