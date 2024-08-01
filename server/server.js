const express = require('express')
const dotenv = require('dotenv')
const { fetchTokenWithAccessCode } = require('./helper')
const cors = require('cors');
const path = require('path');

const stats = require("./stats");
// configurations
dotenv.config()

// Boot express
const app = express()
const port = process.env.PORT || 3000

// middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname,'..', 'public')))


// Application routes
const makeIndex = require("../pages/index.html");
const makeOAuthCallback = require("../pages/oauth-callback.html");
app.get('/', (req, res) => {
	res.send(makeIndex(req));
});

app.get('/oauth-callback', (req, res) => {
	res.send(makeOAuthCallback(req));
});

app.get('/access-token', async (req, res) => {

    try {
        const code = req.query.code;
        const refresh = req.query.refresh;
        if(!code) throw new Error("No Access code provided");
        const {
            error,
            data: accessData,
            message
        } = await fetchTokenWithAccessCode(code, refresh);
        if(error) {
            //handle properly
            return res.status(400).json({
                error: true,
                message,
            });
        }else {
            data = accessData;
        }
        return res.json({
            error: false,
            ...data
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: true,
            message: `${error.message}`,
        });
    }
});

const requiredFields = {
    storyPointsMedian: function(value){
        if(value === undefined) {
            return {message: "storyPointsMedian is undefined"}
        }
        if(typeof value !== "number") {
            return {message: "storyPointsMedian is not a number"}
        }
        if(value < 0 ) {
            return {message: "storyPointsMedian is negative"}
        }
    },
    storyPointsConfidence: function(value){
        if(value === undefined) {
            return {message: "storyPointsConfidence is undefined"}
        }
        if(typeof value !== "number") {
            return {message: "storyPointsConfidence is not a number"}
        }
        if(value < 0 ) {
            return {message: "storyPointsConfidence is negative"}
        }
        if(value > 100) {
            return {message: "storyPointsConfidence is greater than 100"}
        }
    }
}
function validateAdjustedStoryPoints(req, res, next) {
    const errors = [];
    for(let requiredField in requiredFields) {
        let error = requiredFields[requiredField](req.body[requiredField]);
        if(error) {
            errors.push(error)
        }
    }
    if(errors.length) {
        res.status(400).json({errors})
    } else {
        next();
    }
}

app.post('/adjusted-story-points', validateAdjustedStoryPoints, (req, res) => {


    const extraStoryPoints = stats.estimateExtraPoints(req.body.storyPointsMedian, req.body.storyPointsConfidence, req.body.riskThreshold || 80)
    const adjustedStoryPoints = req.body.storyPointsMedian + extraStoryPoints;
    // Respond with a status message
    res.status(200).json({ 
        adjustedStoryPoints, 
        extraStoryPoints,
        roundedExtraStoryPoints: Math.round(extraStoryPoints),
        roundedAdjustedStoryPoints: Math.round(adjustedStoryPoints)
    });
  });

// Start server
app.listen(port, () => console.log(`Server is listening on port ${port}!`))

// Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (err) => {
    console.log(err)
})

process.on('uncaughtException', (err) => {
    console.log(err.message)
})
