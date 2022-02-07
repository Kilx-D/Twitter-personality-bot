require("dotenv").config();
const express = require('express');
const openai = require('openai');

const mongoose = require('mongoose');

const app = express();

mongoose.connect(process.env.DATABASE_URL)

const dataSchema = new mongoose.Schema({
    name: String
});

const cred = mongoose.model("cred", dataSchema);

const twitter = require("twitter-api-v2").default;
const twitterClient = new twitter({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
})

app.get("/", (req, res) => {
    res.send("twitter bot ib landing page")
})


//auth
app.get("/auth", (req, res) => {
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        "/callback",
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
      );

    const newData = new cred({
        name: "codeVerifier and state",
        codeVerifier,
        state
    })

    newData.save();
    
    res.redirect(url)

    //save code verifier and state
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