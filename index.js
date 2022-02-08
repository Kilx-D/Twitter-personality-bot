//sets up the file to use environment varibles
require("dotenv").config();
//gives the program the ability to read local files
const fs = require("fs");
//javascript framework for making web servers easier
const express = require("express");
//openai module
const { Configuration, OpenAIApi } = require("openai");

//sets up the module for interacting with the database
const mongoose = require("mongoose");

const app = express();

//connects the server to the remote database
mongoose.connect(process.env.DATABASE_URL);
//the callback url to use when the twitter user is authenicated
const callbackUrl = "http://127.0.0.1:3000/callback";

//sets up a mongo document standards for storing states and verifier code
const codestateSchema = new mongoose.Schema({
  codeV: String,
  State: String,
});

//sets up the mongo document with the above standard
const codestate = mongoose.model("cred", codestateSchema);

//creates another mongo document for storing tokens
const tokenSchema = new mongoose.Schema({
  accessTkn: String,
  refreshTkn: String,
});

const tkn = mongoose.model("token", tokenSchema);

//sets up and configures the twitter api
const twitter = require("twitter-api-v2").default;
const twitterClient = new twitter({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

//sets up the openai and configures to use the AI
const configuration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_SECRET,
});
const openai = new OpenAIApi(configuration);

app.get("/", (req, res) => {
  res.send("twitter bot ib landing page");
});

//auth
app.get("/auth", (req, res) => {
  //retrieves the url, code verifier and stat
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    //gives the api our callback url
    callbackUrl,
    //the scopes of permission we're asking to the user
    { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
  );

  //saving the code verifier and the state to the database
  const newData = new codestate({
    codeV: codeVerifier,
    State: state,
  });

  newData.save();

  //redirects the user to the callback url
  res.redirect(url);

  //save code verifier and state
});

//callback
app.get("/callback", (req, res) => {
  //gathers the url data from the url
  const { state, code } = req.query;

  //looks into the database for a entry with the state defined in the url
  codestate.findOne({ State: state }, (err, result) => {
    if (!err) {
      if (!result) {
        //if the code verifier and state in the url does match any in the database
        //then it sends this error to the error
        return res.status(400).send("stored tokens to not match!");
      }

      //logs in with twitter
      const twitterData = twitterClient
        .loginWithOAuth2({
          //uses the code in the database
          //then the code in the url
          //then we give it a callback url
          code,
          codeVerifier: result.codeV,
          redirectUri: callbackUrl,
        })
        .then((x) => {
          //the api then sends us a access and refresh token
          const toks = new tkn({
            accessTkn: x.accessToken,
            refreshTkn: x.refreshToken,
          });

          //those tokens are then saves into the database
          toks.save();

          //the user will then get a success message and a 200 status code
          res.status(200).send("success!");
        });
    }
  });
});

//tweet
app.get(
  "/tweet",
  (tweet = (req, res) => {
    //go through the database for a refresh token from the user
    tkn.find({}, (err, results) => {
      //gets the refresh token from the database

      const refreshTokn = results[0].refreshTkn;

      //refreshes the refresh token to get a new access token
      twitterClient.refreshOAuth2Token(refreshTokn).then((x) => {
        //gathers the new access and refresh token
        //then stores those tokens in the database
        tkn.findOneAndUpdate(
          { refreshTkn: refreshTokn },
          { accessTkn: x.accessToken, refreshTkn: x.refreshToken },
          {
            //makes sure that previous tokens are replaces with the new tokens
            overwrite: true,
          },
          () => {
            //fines a local text file names "topics.txt"
            //this stores a bunch of topics the bot will talk about
            fs.readFile("./topics.txt", "utf-8", (err, fileData) => {
              //the data in the file are parsed into an array
              const parseData = fileData.split("\n");
              //fetches a random index in the array so that it can pick a random topic
              const stuff =
                parseData[Math.floor(Math.random() * parseData.length)];
              console.log(stuff);
              //gets the AI api ready to send a message
              const nextTweet = openai
                .createCompletion("text-davinci-001", {
                  //the specific algorithm ai to use
                  //tells the ai to tweet about the topic given
                  prompt: `tweet ${stuff}`,
                  //max amount of data to receive
                  max_tokens: 52,
                })
                //after the api gives a answer
                //the info is saved as "bot"
                .then((bot) => {
                  console.log(bot.data.choices[0].text);
                  try {
                    //uses the text the ai gived
                    //and tweet it using the twitter api
                    x.client.v2.tweet(bot.data.choices[0].text);
                  } catch (error) {
                    //if it doesnt work, try again
                    tweet();
                    return;
                  }
                  //gives the user the text the ai gave
                  res.send(bot.data.choices[0].text);
                });
            });
          }
        );
      });
    });
  })
);

//sets up the web server to listen at 3000 or whatever the web server provides
app.listen(process.env.PORT || 3000, () => {
  console.log("server ready");
});
