require('dotenv').config('.env');
const cors = require('cors');
const express = require('express');
const app = express();
const morgan = require('morgan');
const jwt = require("jsonwebtoken");

const {
  PORT = 3000
} = process.env;
const {
  getUser
} = require('./middleware/getUser')
// TODO - require express-openid-connect and destructure auth from it
const {
  auth,
  requiresAuth
} = require("express-openid-connect");
const {
  User,
  Cupcake
} = require('./db');

// middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

/* *********** YOUR CODE HERE *********** */
// follow the module instructions: destructure config environment variables from process.env
// follow the docs:
// define the config object
// attach Auth0 OIDC auth router
// create a GET / route handler that sends back Logged in or Logged out

const {
  SECRET,
  BASE_URL,
  CLIENT_ID,
  ISSUER_BASE_URL,
  JWT_SECRET
} = process.env;

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: SECRET,
  baseURL: BASE_URL,
  clientID: CLIENT_ID,
  issuerBaseURL: ISSUER_BASE_URL,
};

app.use(auth(config));

app.use(async (req, res, next) => {
  if (req.oidc.user) {
    try {
      const { nickname, name, email } = req.oidc.user;
      const [user, created] = await User.findOrCreate({
        where: {
          username: nickname,
          name: name,
          email: email,
        },
      });

      if (!created) {
        await user.update({
          username: nickname,
          name: name,
          email: email,
        });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  next();
});




app.get('/cupcakes', async (req, res, next) => {
  try {
    const cupcakes = await Cupcake.findAll();
    res.send(cupcakes);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/", async (req, res, next) => {
  try {
    console.log(req.oidc.user);
    const user = req.oidc.user;
    let message = "Logged out";
    if (req.oidc.isAuthenticated()) {
      message = `Welcome, ${user.nickname}`;
      email = user.email
      picture = user.picture
      nickname = user.nickname

    }
    const html = `
      <html>
        <head>
          <title>Web App Ltd</title>
        </head>
        <body>
          <h1>${message}</h1>
          <h1>Username: ${nickname}</h1>
          <h1>Email address: ${email}</h1>
          <img src="${picture}"></img>
        </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


app.get("/profile", requiresAuth(), (req, res, next) => {
  try {
    console.log(req.user)
    res.send(JSON.stringify(req.user));
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/me", async (req, res, next) => {
  try {
    const user = await User.findOne({
      username: req.oidc.user.nickname,
      raw: true,
    });
    if (user) {
      const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Add any other properties that you want to return here
      };
      const token = jwt.sign(userData, JWT_SECRET, {
        expiresIn: "1w"
      });
      res.send({
        user: userData,
        token
      });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.post("/cupcakes", async (req, res, next) => {
  try {
    const auth = req.header("Authorization");
    const token = auth.split(" ")[1];
    const verifiedToken = jwt.verify(token, JWT_SECRET);
    console.log(verifiedToken);
    if (verifiedToken) {
      req.user = verifiedToken;
      const { title, flavor, stars } = req.body;
      const createdCupcake = await Cupcake.create({
        title,
        flavor,
        stars,
        userId: req.user.id,
      });
      res.send(createdCupcake);
    }
    if (!req.user) {
      res.status(401).send("No valid token, access denied");
    }
  } catch (error) {
    console.log(error);
    next();
  }
});


// error handling middleware
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if (res.statusCode < 400) res.status(500);
  res.send({
    error: error.message,
    name: error.name,
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log(`Cupcakes are ready at http://localhost:${PORT}`);
});