// 1. Correctly point to the .env file (one folder up from /src)
require('dotenv').config({ path: '../.env' }); 

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jsforce = require('jsforce');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Session storage with a fallback secret to prevent startup errors
app.use(session({
    secret: process.env.SESSION_SECRET || 'salesforce_validation_manager_secret_123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// Salesforce OAuth2 Configuration
const oauth2 = new jsforce.OAuth2({
    loginUrl: 'https://login.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_CALLBACK_URL // Must be http://localhost:5000/oauth/callback
});

// --- ROUTES ---

// 1. Login Route
app.get('/api/auth/login', (req, res) => {
    const authUrl = oauth2.getAuthorizationUrl({
        scope: 'api refresh_token offline_access'
    });
    res.redirect(authUrl);
});

// 2. Callback Route (MATCHES YOUR NEW URL: /oauth/callback)
app.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No authorization code received.');

    const conn = new jsforce.Connection({ oauth2: oauth2 });
    try {
        await conn.authorize(code);
        
        // Save credentials to session
        req.session.accessToken = conn.accessToken;
        req.session.instanceUrl = conn.instanceUrl;
        req.session.refreshToken = conn.refreshToken;

        console.log("Authentication Successful!");
        
        // Redirect to your React app dashboard
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).send("Login failed: " + err.message);
    }
});

// 3. Fetch Validation Rules from Salesforce
app.get('/api/validation-rules', async (req, res) => {
    if (!req.session.accessToken) return res.status(401).json({ error: "Unauthorized" });

    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });

    try {
        // Querying the Tooling API for Validation Rules
        const result = await conn.tooling.query(
            "SELECT Id, EntityDefinition.DeveloperName, ValidationName, Active, Description FROM ValidationRule"
        );
        res.json(result.records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Toggle Rule Status (Enable/Disable)
app.post('/api/toggle-rule', async (req, res) => {
    const { id, active } = req.body;
    if (!req.session.accessToken) return res.status(401).json({ error: "Unauthorized" });

    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });

    try {
        await conn.tooling.sobject('ValidationRule').update({
            Id: id,
            Active: active
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});