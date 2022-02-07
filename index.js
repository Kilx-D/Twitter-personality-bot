require("dotenv").config();
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");

const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.DATABASE_URL);
const callbackUrl = "http://127.0.0.1:3000/callback";

const codestateSchema = new mongoose.Schema({
  codeV: String,
  State: String,
});

const codestate = mongoose.model("cred", codestateSchema);

const tokenSchema = new mongoose.Schema({
  accessTkn: String,
  refreshTkn: String,
});

const tkn = mongoose.model("token", tokenSchema);

const twitter = require("twitter-api-v2").default;
const twitterClient = new twitter({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});


const configuration = new Configuration({
    organization: process.env.OPENAI_ORG,
    apiKey: process.env.OPENAI_SECRET            
})
const openai = new OpenAIApi(configuration);

app.get("/", (req, res) => {
  res.send("twitter bot ib landing page");
});

//auth
app.get("/auth", (req, res) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    callbackUrl,
    { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
  );

  const newData = new codestate({
    codeV: codeVerifier,
    State: state,
  });

  newData.save();

  res.redirect(url);

  //save code verifier and state
});

//callback
app.get("/callback", (req, res) => {
  const { state, code } = req.query;
  codestate.findOne({ State: state }, (err, result) => {
    if (!err) {
      if (!result) {
        return res.status(400).send("stored tokens to not match!");
      }

      // client: loggedClient,
      //     accessToken,
      //     refreshToken,
      const twitterData = twitterClient
        .loginWithOAuth2({
          code,
          codeVerifier: result.codeV,
          redirectUri: callbackUrl,
        })
        .then((x) => {
          const toks = new tkn({
            accessTkn: x.accessToken,
            refreshTkn: x.refreshToken,
          });

          toks.save();
          res.status(200).send("success!");
        });
    }
  });
});

//tweet
app.get("/tweet", (req, res) => {
  tkn.find({}, (err, results) => {
    const refreshTokn = results[0].refreshTkn;
   

    // const {
    //   client: refreshedClient,
    //   accessToken,
    //   refreshToken: newRefreshToken,
    // } =
    
    twitterClient.refreshOAuth2Token(refreshTokn).then((x) => {
     
      tkn.findOneAndUpdate(
        { refreshTkn: refreshTokn },
        { accessTkn: x.accessToken, refreshTkn: x.refreshToken }, {
            overwrite: true
        }, () => {


            const nextTweet = openai.createCompletion('text-davinci-001', {
              prompt: 'some cool tweet for the boys',
              max_tokens: 64,
            }).then(bot => {

              console.log(bot.data.choices[0].text);

              x.client.v2.tweet(
                bot.data.choices[0].text
              );
  
  
              res.send(bot.data.choices[0].text)

            })

            




          
      //       console.log("retrieving user data");
      //       x.client.v2.me().then((z) => {
      //         res.send(z.data);
      //   }
      // );
     
      });
    });
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("server ready");
});
