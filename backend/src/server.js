require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jsforce = require('jsforce');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, '../../frontend/dist');
// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// Salesforce OAuth2
const oauth2 = new jsforce.OAuth2({
    loginUrl: 'https://login.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_CALLBACK_URL
});
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        // Only use secure cookies when the app is live on Railway (HTTPS)
        secure: process.env.NODE_ENV === 'production', 
        // Required for cross-site OAuth redirects on many modern browsers
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));
// ----- ROUTES -----

// Get current user
app.get('/api/user', (req, res) => {
    if (!req.session.accessToken) return res.json({});
    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });
    conn.identity((err, identity) => {
        if (err) return res.json({});
        res.json({
            username: identity.username,
            organization: identity.organization_id
        });
    });
});

// Login
app.get('/api/auth/login', (req, res) => {
    const authUrl = oauth2.getAuthorizationUrl({
        scope: 'api refresh_token offline_access'
    });
    res.redirect(authUrl);
});

// OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No authorization code received.');

    const conn = new jsforce.Connection({ oauth2 });
    try {
        await conn.authorize(code);
        req.session.accessToken = conn.accessToken;
        req.session.instanceUrl = conn.instanceUrl;
        req.session.refreshToken = conn.refreshToken;
        
        console.log('Authentication Successful!');
        // Redirect to frontend port
        res.redirect('http://localhost:5173/dashboard'); 
    } catch (err) {
        console.error('Auth Error:', err);
        res.status(500).send('Login failed: ' + err.message);
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Fetch Validation Rules
app.get('/api/validation-rules', async (req, res) => {
    if (!req.session.accessToken) return res.status(401).json({ error: 'Unauthorized' });

    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });

    try {
        const result = await conn.tooling.query(
            "SELECT Id, EntityDefinition.DeveloperName, ValidationName, Active, Description FROM ValidationRule"
        );
        res.json(result.records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deploy changes - Corrected Metadata placement
app.post('/api/deploy-changes', async (req, res) => {
    if (!req.session.accessToken) return res.status(401).json({ error: 'Unauthorized' });

    const { changes } = req.body;
    if (!changes || !Array.isArray(changes)) {
        return res.status(400).json({ error: 'Invalid changes array' });
    }

    const conn = new jsforce.Connection({
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });

    try {
        for (const change of changes) {
            // 1. Retrieve the existing rule definition
            const fullRule = await conn.tooling.sobject('ValidationRule').retrieve(change.id);
            
            // 2. Prepare the update body
            // We MUST put 'active' inside Metadata and REMOVE it from the top level
            const updatePayload = {
                Id: change.id,
                Metadata: {
                    ...fullRule.Metadata,
                    active: change.active // Lowercase 'active' is required inside Metadata
                }
            };

            // 3. Perform the update
            await conn.tooling.sobject('ValidationRule').update(updatePayload);
        }

        res.json({ success: true, updated: changes.length });
    } catch (err) {
        console.error('Deploy error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Serve the static files from the React app
app.use(express.static(frontendPath));

// Handle any requests that don't match API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});