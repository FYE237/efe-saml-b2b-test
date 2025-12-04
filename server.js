require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;

const app = express();
const fs = require('fs');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

const samlStrategy = new SamlStrategy(
  {
    entryPoint: process.env.SAML_IDP_ENTRYPOINT, // Azure AD SAML endpoint
    issuer: process.env.SAML_SP_ISSUER,
    callbackUrl: process.env.SAML_SP_ACS, // ACS endpoint
    cert: process.env.SAML_IDP_CERT
  },
  (profile, done) => {
    console.log('SAML profile:', profile);
    return done(null, profile);
  }
);

passport.use(samlStrategy);

app.get('/', (req, res) => {
  res.send('Node.js SAML app fonctionnelle !');
});

// ACS endpoint pour recevoir SAMLResponse
app.post('/saml/acs', passport.authenticate('saml', { session: false }), (req, res) => {
  res.send(`Bienvenue ${JSON.stringify(req.user)}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
