// require('dotenv').config();

// const express = require('express');
// const bodyParser = require('body-parser');
// const passport = require('passport');
// const SamlStrategy = require('passport-saml').Strategy;
// const samlify = require('samlify');

// const app = express();
// const {readFileSync} = require('fs');


// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(passport.initialize());



// /* Configuration en tant que Service Provider*/
// const samlStrategy = new SamlStrategy(
//   {
//     entryPoint: process.env.SAML_IDP_ENTRYPOINT, // Azure AD SAML endpoint
//     issuer: process.env.SAML_SP_ISSUER,
//     callbackUrl: process.env.SAML_SP_ACS, // ACS endpoint
//     cert: process.env.SAML_IDP_CERT
//   },
//   (profile, done) => {
//     console.log('SAML profile:', profile);
//     return done(null, profile);
//   }
// );

// passport.use(samlStrategy);

// app.get('/', (req, res) => {
// //   console.log ("ACS = ", process.env.SAML_SP_ACS);
// //   console.log ("Issuer = ", process.env.SAML_SP_ISSUER)
//   res.send('Node.js SAML app fonctionnelle !');
// });

// // ACS endpoint pour recevoir SAMLResponse
// app.post('/saml/acs', passport.authenticate('saml', { session: false }), (req, res) => {
//   res.send(`Bienvenue ${JSON.stringify(req.user)}`);
// });



// /*Configuration en tant que Identity Provider*/


// /* ------------------ CERTIFICATS ------------------ */
// const idp_public_cert = process.env.MYIDP__CERT
// const idp_private_key = process.env.MYIDP_PRIVATE_KEY

// /* ------------------ CONFIG samlify : vrai IdP ------------------ */
// samlify.setSchemaValidator({ validate: () => Promise.resolve() });

// // Déclarer l’IdP
// const myIdP = samlify.IdentityProvider({
//   //entityId: process.env.MYIDP_ENTITY_ID,
//   metadata: readFileSync(__dirname + '/metadata/idp-metadata.xml'),
//   signingCert: idp_public_cert,
//   privateKey: idp_private_key,
//   wantAuthnRequestsSigned: false,
// //   singleSignOnService: [
// //     {
// //       Binding: samlify.Constants.namespace.binding.redirect,
// //       Location: process.env.MYIDP_LOGIN_URL
// //     },
// //     {
// //       Binding: samlify.Constants.namespace.binding.post, // <-- ajouté
// //       Location: process.env.MYIDP_LOGIN_URL
// //     }
// //   ],
// //   singleLogoutService: [
// //   {
// //     Binding: samlify.Constants.namespace.binding.redirect,
// //     Location: "https://google.com"
// //   }
// //   ],
// });

// // Déclarer Azure AD comme SP
// const azureSP = samlify.ServiceProvider({
//     metadata : readFileSync(__dirname + '/metadata/sp-metadata.xml'),
// //   entityId: process.env.AZURE_IDP_ISSUER,
//     // assertionConsumerService: [
//     //   {
//     //     Binding: samlify.Constants.namespace.binding.post,
//     //     Location: process.env.SAML_IDP_ENTRYPOINT
//     //   }
//     // ]
// });

// console.log("myidP", myIdP.entityMeta.getEntityID())
// //console.log("AZURE_IDP_ISSUER : ", process.env.AZURE_IDP_ISSUER);
// console.log('azureSP entityId:', azureSP.entityMeta.getEntityID());
// console.log('azureSP ACS :', azureSP.entityMeta.meta.assertionConsumerService);
// //console.log('azureSP ACS (REDIRECT):', azureSP.entityMeta.getAssertionEndpoint(samlify.Constants.namespace.binding.redirect));


// /* ============================================================================
//    3. PAGES & ROUTES IdP
// ============================================================================ */

// // 3.1 — Formulaire email
// app.get('/login', (req, res) => {
//   res.send(`
//     <form method="POST" action="/login">
//       <label>Email :</label>
//       <input name="email" type="email" required />
//       <button type="submit">Se connecter</button>
//     </form>
//   `);
// });

// // // 3.2 — Affiche un formulaire si Azure envoie une AuthnRequest
// // app.get('/saml/login', (req, res) => {

// //   // Stocker SAMLRequest + RelayState dans des inputs hidden
// //   res.send(`
// //     <form method="POST" action="/saml/login">
// //       <input type="hidden" name="SAMLRequest" value="${req.query.SAMLRequest}" />
// //       <input type="hidden" name="RelayState" value="${req.query.RelayState || ''}" />

// //       <label>Email :</label>
// //       <input name="email" type="email" required />
// //       <button type="submit">Valider</button>
// //     </form>
// //   `);
// // });

// // // 3.3 — Générer une SAMLResponse
// // app.post('/saml/login', async (req, res) => {
// //   const { email, SAMLRequest, RelayState } = req.body;

// //   const user = {
// //     nameId: email,
// //     email: email,
// //     format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
// //   };

// //   const { context } = await myIdP.createLoginResponse(
// //     azureSP,
// //     samlify.Constants.namespace.binding.post,
// //     { request: SAMLRequest, relayState: RelayState },
// //     user
// //   );

// //   res.send(context); // renvoie le formulaire auto-submitting vers Azure
// // });


// // Assure-toi d'avoir bodyParser.urlencoded({ extended: false }) et bodyParser.json() si nécessaire.

// app.all('/saml/login', async (req, res) => {
//   try {
//     // Détecter binding en fonction de la méthode + paramètres
//     const isPostBinding = req.method === 'POST' && req.body && req.body.SAMLRequest;
//     const isRedirectBinding = req.method === 'GET' && req.query && req.query.SAMLRequest;

//     if (!isPostBinding && !isRedirectBinding) {
//       // Si la requête n'a pas SAMLRequest, afficher un formulaire générique ou 400.
//       return res.status(400).send('No SAMLRequest found (expected GET query or POST body).');
//     }

//     const binding = isPostBinding
//       ? samlify.Constants.namespace.binding.post
//       : samlify.Constants.namespace.binding.redirect;

//     console.log('[DEBUG] Received SAMLRequest via', binding);

//     // Parser correctement la requête SAML pour obtenir la structure attendue par createLoginResponse
//     // NOTE: parseLoginRequest veut (sp, binding, { body, query, headers, rawBody })
//     const parsedRequest = await myIdP.parseLoginRequest(azureSP, binding, {
//       body: req.body,
//       query: req.query,
//       headers: req.headers
//     });

//     console.log('[DEBUG] parsedRequest:', {
//       id: parsedRequest.id,
//       issuer: parsedRequest.issuer,
//       acsUrl: parsedRequest.binding === samlify.Constants.namespace.binding.post
//         ? parsedRequest.assertionConsumerServiceURL // ou parsedRequest.destination
//         : parsedRequest.redirectTo
//     });

//     // Debug: vérifier que le SP expose bien un ACS pour le binding POST
//     const acsEndpoint = azureSP.entityMeta.getAssertionEndpoint(samlify.Constants.namespace.binding.post);
//     console.log('[DEBUG] azureSP ACS endpoint (POST):', acsEndpoint);

//     // Construire l'objet user (depuis un formulaire de login ou test)
//     const email = req.body.email || 'test@example.com'; // remplacer par valeur réelle si fournie
//     const user = {
//       nameId: email,
//       email,
//       format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
//     };

//     // CRUCIAL: passer parsedRequest (ou parsedRequest.extract) selon la version de samlify
//     // createLoginResponse accepte soit parsedRequest soit un objet { id, context... }
//     const { context } = await myIdP.createLoginResponse(
//       azureSP,
//       samlify.Constants.namespace.binding.post, // réponse en POST vers le SP
//       parsedRequest, // <-- NE PAS passer { request: rawSAML } directement
//       user
//     );

//     // Renvoie du formulaire auto-submit vers Azure (SAMLResponse)
//     res.send(context);
//   } catch (err) {
//     console.error('[SAML ERROR]', err);
//     // Affiche le message d'erreur pour debug (ne leak pas certifs en prod)
//     res.status(500).send('SAML Error: ' + err.message);
//   }
// });



// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


const express = require('express');
const saml = require('samlify');

const { addMinutes } = require('date-fns')
const { readFileSync } = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const port = 3000;

const generateRequestID = () => {
    return '_' + randomUUID()
}

const createTemplateCallback = (idp, sp, email) => template => {
    const assertionConsumerServiceUrl = sp.entityMeta.getAssertionConsumerService(saml.Constants.wording.binding.post)

    const nameIDFormat = idp.entitySetting.nameIDFormat
    const selectedNameIDFormat = Array.isArray(nameIDFormat) ? nameIDFormat[0] : nameIDFormat

    const id = generateRequestID()
    const now = new Date()
    const fiveMinutesLater = addMinutes(now, 5)

    const tagValues = {
        ID: id,
        AssertionID: generateRequestID(),
        Destination: assertionConsumerServiceUrl,
        Audience: sp.entityMeta.getEntityID(),
        EntityID: sp.entityMeta.getEntityID(),
        SubjectRecipient: assertionConsumerServiceUrl,
        Issuer: idp.entityMeta.getEntityID(),
        IssueInstant: now.toISOString(),
        AssertionConsumerServiceURL: assertionConsumerServiceUrl,
        StatusCode: 'urn:oasis:names:tc:SAML:2.0:status:Success',
        ConditionsNotBefore: now.toISOString(),
        ConditionsNotOnOrAfter: fiveMinutesLater.toISOString(),
        SubjectConfirmationDataNotOnOrAfter: fiveMinutesLater.toISOString(),
        NameIDFormat: selectedNameIDFormat,
        NameID: email,
        InResponseTo: 'null',
        AuthnStatement: '',
        attrFirstName: 'Jon',
        attrLastName: 'Snow'
    }

    return {
        id,
        context: saml.SamlLib.replaceTagsByValue(template, tagValues)
    }
}

const sp = saml.ServiceProvider({
    metadata: readFileSync(__dirname + '/metadata/sp-metadata.xml')
});

const idp = saml.IdentityProvider({
    metadata: readFileSync(__dirname + '/metadata/idp-metadata.xml'),
    // privateKey: readFileSync(__dirname + '/key/idp/private_key.pem'),
    // privateKeyPass: 'jXmKf9By6ruLnUdRo90G',
    isAssertionEncrypted: false,
    loginResponseTemplate: {
        context: '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}" InResponseTo="{InResponseTo}"><saml:Issuer>{Issuer}</saml:Issuer><samlp:Status><samlp:StatusCode Value="{StatusCode}"/></samlp:Status><saml:Assertion ID="{AssertionID}" Version="2.0" IssueInstant="{IssueInstant}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"><saml:Issuer>{Issuer}</saml:Issuer><saml:Subject><saml:NameID Format="{NameIDFormat}">{NameID}</saml:NameID><saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData NotOnOrAfter="{SubjectConfirmationDataNotOnOrAfter}" Recipient="{SubjectRecipient}" InResponseTo="{InResponseTo}"/></saml:SubjectConfirmation></saml:Subject><saml:Conditions NotBefore="{ConditionsNotBefore}" NotOnOrAfter="{ConditionsNotOnOrAfter}"><saml:AudienceRestriction><saml:Audience>{Audience}</saml:Audience></saml:AudienceRestriction></saml:Conditions>{AttributeStatement}</saml:Assertion></samlp:Response>',
        attributes: [
            { name: 'firstName', valueTag: 'firstName', nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic', valueXsiType: 'xs:string' },
            { name: 'lastName', valueTag: 'lastName', nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic', valueXsiType: 'xs:string' },
        ],
    }
});

app.get('/metadata', (req, res) => {
    res.type('application/xml');
    res.send(idp.getMetadata());
});

app.post('/saml/login', async (req, res) => {
    try {
        const user = { email: 'user@gmail.com' };
        const { context, entityEndpoint } = await idp.createLoginResponse(sp, null, saml.Constants.wording.binding.post, user, createTemplateCallback(idp, sp, user.email));

        res.status(200).send({ samlResponse: context, entityEndpoint })
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
})

app.listen(port, () => {
    console.log(`Identity Provider server listening at http://localhost:${port}`);
});
