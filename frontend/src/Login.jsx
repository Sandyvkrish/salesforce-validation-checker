import './Login.css'

function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="landing">
      <div className="logo-section">
        <div className="logo-icon">⚡</div>
        <h1>Salesforce Switch</h1>
        <p className="tagline">Validation Rule Manager</p>
      </div>

      <div className="card">
        <p className="lead">
          Easily enable and disable Validation Rules in your Salesforce Org.
          Perfect for data migrations, testing, and managing automation without
          digging through Setup menus.
        </p>

        <div className="features">
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <span>Fetch all validation rules instantly</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔘</span>
            <span>Toggle ON/OFF with one click</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🚀</span>
            <span>Deploy changes directly to your Org</span>
          </div>
        </div>

        <p className="privacy-note">
          🔒 None of your organisation data is captured or stored.
        </p>

        <button className="login-btn" onClick={handleLogin}>
          <span className="salesforce-icon">☁️</span>
          Login with Salesforce
        </button>

        <p className="api-note">
          Uses OAuth 2.0 • Respects your Org's API limits
        </p>
      </div>

      <div className="footer-badge">
        <span className="dot"></span>
        Production Environment
      </div>
    </div>
  )
}

export default Login