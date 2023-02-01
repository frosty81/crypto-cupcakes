require('dotenv').config('.env');
const cors = require('cors');
const express = require('express');
const app = express();
const morgan = require('morgan');
const { PORT = 3000 } = process.env;
// TODO - require express-openid-connect and destructure auth from it
const { auth } = require("express-openid-connect");
const { User, Cupcake } = require('./db');

// middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* *********** YOUR CODE HERE *********** */
// follow the module instructions: destructure config environment variables from process.env
// follow the docs:
  // define the config object
  // attach Auth0 OIDC auth router
  // create a GET / route handler that sends back Logged in or Logged out

const {SECRET, BASE_URL, CLIENT_ID, ISSUER_BASE_URL } = process.env;

const config = {
  authRequired: true,
  auth0Logout: true,
  secret: SECRET,
  baseURL: BASE_URL,
  clientID: CLIENT_ID,
  issuerBaseURL: ISSUER_BASE_URL,
};

app.use(auth(config));

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
     res.send(req.oidc.isAuthenticated() ? 'logged in' : 'not logged in');
   } catch (error) {
     console.error(error);
     next(error);
   }
 });

  app.get("/profile", (req, res, next) => {
    try {
       res.send(JSON.stringify(req.oidc.user));
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

// error handling middleware
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

app.listen(PORT, () => {
  console.log(`Cupcakes are ready at http://localhost:${PORT}`);
});

