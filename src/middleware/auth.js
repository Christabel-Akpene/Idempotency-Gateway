
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers["api-key"];

    console.log("header api key", apiKey);
    console.log("env api key", process.env.API_KEY)
    if (!apiKey || apiKey !== process.env.API_KEY){
        return(
            res.status(401).json({message: "You are unauthorised. A valid api key is required."})
        )
    }
    next();
}

export default authMiddleware;