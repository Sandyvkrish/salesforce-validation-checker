Hey there! This is my submission for the CloudVandana technical assignment. I built this tool to solve a common pain point for Salesforce Admins: having to click through multiple setup screens just to toggle a validation rule.

With this app, you can see all your rules in one place and flip them on or off with a single click.

🔗 Check it out
Live App: salesforce-validation-checker-production.up.railway.app

🧠 How I Built This
I went with a MERN stack (React + Node) because it’s the most efficient way to handle a snappy UI while managing complex Salesforce OAuth flows in the background.

The Technical "Win"
The biggest challenge was the Salesforce Tooling API. Unlike the standard REST API, the Tooling API is picky about metadata updates. I used JSForce to bridge this gap, ensuring that when you hit "Toggle," the app sends a clean metadata update to the Salesforce Org without breaking the existing rule logic.

🛠️ The Stack
Frontend: React (Vite) – Focused on a clean, no-nonsense interface.

Backend: Node.js & Express – Handles the secure OAuth 2.0 handshake and session management.

Integration: JSForce – My main tool for talking to Salesforce.

Deployment: Railway – Used for hosting because it handles Monorepos beautifully.
