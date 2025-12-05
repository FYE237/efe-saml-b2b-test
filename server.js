require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const samlify = require('samlify');

const app = express();
const fs = require('fs');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());



/* Configuration en tant que Service Provider*/
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
//   console.log ("ACS = ", process.env.SAML_SP_ACS);
//   console.log ("Issuer = ", process.env.SAML_SP_ISSUER)
  res.send('Node.js SAML app fonctionnelle !');
});

// ACS endpoint pour recevoir SAMLResponse
app.post('/saml/acs', passport.authenticate('saml', { session: false }), (req, res) => {
  res.send(`Bienvenue ${JSON.stringify(req.user)}`);
});



/*Configuration en tant que Identity Provider*/


/* ------------------ CERTIFICATS ------------------ */
const idp_public_cert = process.env.MYIDP__CERT
const idp_private_key = process.env.MYIDP_PRIVATE_KEY

/* ------------------ CONFIG samlify : vrai IdP ------------------ */
samlify.setSchemaValidator({ validate: () => Promise.resolve() });

// Déclarer l’IdP
const myIdP = samlify.IdentityProvider({
  entityId: process.env.MYIDP_ENTITY_ID,
  signingCert: idp_public_cert,
  privateKey: idp_private_key,
  wantAuthnRequestsSigned: false,
  singleSignOnService: [
    {
      Binding: samlify.Constants.namespace.binding.redirect,
      Location: process.env.MYIDP_LOGIN_URL
    }
  ]
});

// Déclarer Azure AD comme SP
const azureSP = samlify.ServiceProvider({
  entityId: process.env.SAML_SP_ISSUER,
  assertionConsumerService: [
    {
      Binding: samlify.Constants.namespace.binding.post,
      Location: process.env.SAML_IDP_ENTRYPOINT
    }
  ]
});

/* ============================================================================
   3. PAGES & ROUTES IdP
============================================================================ */

// 3.1 — Formulaire email
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <label>Email :</label>
      <input name="email" type="email" required />
      <button type="submit">Se connecter</button>
    </form>
  `);
});

// 3.2 — Affiche un formulaire si Azure envoie une AuthnRequest
app.get('/saml/login', (req, res) => {

  // Stocker SAMLRequest + RelayState dans des inputs hidden
  res.send(`
    <form method="POST" action="/saml/login">
      <input type="hidden" name="SAMLRequest" value="${req.query.SAMLRequest}" />
      <input type="hidden" name="RelayState" value="${req.query.RelayState || ''}" />

      <label>Email :</label>
      <input name="email" type="email" required />
      <button type="submit">Valider</button>
    </form>
  `);
});

// 3.3 — Générer une SAMLResponse
app.post('/saml/login', async (req, res) => {
  const { email, SAMLRequest, RelayState } = req.body;

  const user = {
    nameId: email,
    email: email,
    format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  };

  const { context } = await myIdP.createLoginResponse(
    azureSP,
    "post",
    { request: SAMLRequest, relayState: RelayState },
    user
  );

  res.send(context); // renvoie le formulaire auto-submitting vers Azure
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
