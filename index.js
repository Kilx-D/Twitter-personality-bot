const express = require('express');
const openai = require('openai');

const mongoose = require('mongoose');

const app = express();

// const tweeter = require("twitter-api-v2").default;
// const twitterClient = new twitter({
//     clientId: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET
// })


//auth
app.get("/auth", (req, res) => {
    res.send("hi, this worked, great");
})

//callback
app.get("/callback", (req, res) => {

})

//tweet
app.get("/tweet", (req, res) => {

})

app.listen(process.env.PORT || 3000, () => {
    console.log("server ready");
})