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

// Middleware to find or create a user in the database
app.use(async (req, res, next) => {
  // Check if the user is present in the request object
  if (req.oidc.user) {
    try {
      // Extract the required user details
      const { nickname, name, email } = req.oidc.user;
      // Check if the user already exists in the database or create a new user
      const [user, created] = await User.findOrCreate({
        where: {
          username: nickname,
          name: name,
          email: email,
        },
      });

      // If the user already exists, update the user details
      if (!created) {
        await user.update({
          username: nickname,
          name: name,
          email: email,
        });
      }
    } catch (error) {
      // Log the error message and pass it to the next middleware
      console.error(error);
      next(error);
    }
  }
  // Call the next middleware in the chain
  next();
});

// Route to retrieve all cupcakes
app.get('/cupcakes', async (req, res, next) => {
  try {
    // Retrieve all cupcakes from the database
    const cupcakes = await Cupcake.findAll();
    // Send the retrieved cupcakes as the response
    res.send(cupcakes);
  } catch (error) {
    // Log the error message and pass it to the next middleware
    console.error(error);
    next(error);
  }
});

// Route to display the welcome message
app.get("/", async (req, res, next) => {
  try {
    // Log the user details
    console.log(req.oidc.user);
    const user = req.oidc.user;
    let message = "Logged out";
    // Check if the user is authenticated
    if (req.oidc.isAuthenticated()) {
      message = `Welcome, ${user.nickname}`;
      email = user.email;
      picture = user.picture;
      nickname = user.nickname;
    }
    // Create the HTML response
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
    // Send the HTML response
    res.send(html);
  } catch (error) {
    // Log the error message and pass it to the next middleware
    console.error(error);
    next(error);
  }
});

// Route to handle profile requests
app.get("/profile", requiresAuth(), (req, res, next) => {
  try {
    // Log the user information
    console.log(req.user)
    // Send the user information as a string
    res.send(JSON.stringify(req.user));
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/me", async (req, res, next) => {
  try {
    // Find user in the database using the `nickname` value from the authenticated user object
    const user = await User.findOne({
      username: req.oidc.user.nickname,
      raw: true,
    });

    // If the user was found in the database
    if (user) {
      // Create a userData object containing the user data we want to return
      const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Sign and generate a JWT token with the userData and secret
      const token = jwt.sign(userData, JWT_SECRET, {
        expiresIn: "1w",
      });

      // Return the user data and token to the client
      res.send({
        user: userData,
        token,
      });
    }
  } catch (error) {
    // Log the error to the console
    console.error(error);
    // Call the next middleware with the error
    next(error);
  }
});

app.post("/cupcakes", async (req, res, next) => {
  try {
    // Get the authorization header from the request
    const auth = req.header("Authorization");
    // Split the header value to extract the token
    const token = auth.split(" ")[1];
    // Verify the JWT token using the secret
    const verifiedToken = jwt.verify(token, JWT_SECRET);

    // If the token is valid
    if (verifiedToken) {
      // Add the user data from the token to the request object
      req.user = verifiedToken;
      // Extract the cupcake data from the request body
      const { title, flavor, stars } = req.body;
      // Create a new cupcake in the database with the extracted data and user ID from the verified token
      const createdCupcake = await Cupcake.create({
        title,
        flavor,
        stars,
        userId: req.user.id,
      });
      // Return the created cupcake to the client
      res.send(createdCupcake);
    }
    // If the token is not valid
    if (!req.user) {
      // Return a 401 status with an error message
      res.status(401).send("No valid token, access denied");
    }
  } catch (error) {
    // Log the error to the console
    console.log(error);
    // Call the next middleware
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