import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [rules, setRules] = useState([])
  const [grouped, setGrouped] = useState({})
  const [step, setStep] = useState('loggedIn')  // 'loggedIn' or 'rules'
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [message, setMessage] = useState('')

  // Check if user is logged in
  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.username) setUser(data)
        else window.location.href = '/'   // redirect to login if no session
      })
      .catch(() => window.location.href = '/')
  }, [])

  // Get metadata button
  const handleGetMetadata = async () => {
    setLoading(true)
    setMessage('Querying metadata - Building a list of validation rules...')
    try {
      const res = await fetch('/api/validation-rules', { credentials: 'include' })
      if (res.status === 401) {
        window.location.href = '/'
        return
      }
      const data = await res.json()
      setRules(data)

      // Group by object
      const groupedRules = {}
      data.forEach(rule => {
        const obj = rule.EntityDefinition?.DeveloperName || 'Other'
        if (!groupedRules[obj]) groupedRules[obj] = []
        groupedRules[obj].push(rule)
      })
      setGrouped(groupedRules)
      setStep('rules')
      setMessage('')
    } catch (err) {
      setMessage('Error fetching rules: ' + err.message)
    }
    setLoading(false)
  }

  // Toggle a single rule locally
  const toggleRule = (ruleId) => {
    const update = (list) => list.map(r => r.Id === ruleId ? { ...r, Active: !r.Active } : r)
    setRules(prev => update(prev))
    // Also update grouped state
    setGrouped(prev => {
      const newGrouped = {}
      Object.keys(prev).forEach(obj => {
        newGrouped[obj] = update(prev[obj])
      })
      return newGrouped
    })
  }

  // Enable/disable all rules
  const setAll = (active) => {
    setRules(prev => prev.map(r => ({ ...r, Active: active })))
    setGrouped(prev => {
      const newGrouped = {}
      Object.keys(prev).forEach(obj => {
        newGrouped[obj] = prev[obj].map(r => ({ ...r, Active: active }))
      })
      return newGrouped
    })
  }

  // Deploy changes
  const deployChanges = async () => {
    setDeploying(true)
    setMessage('Deploying changes. Time will vary...')
    try {
      const res = await fetch('/api/deploy-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ changes: rules.map(r => ({ id: r.Id, active: r.Active })) })
      })
      const result = await res.json()
      if (result.success) {
        setMessage('Changes deployed successfully!')
        // Refresh rules from server
        handleGetMetadata()
      } else {
        setMessage('Deploy failed: ' + result.error)
      }
    } catch (err) {
      setMessage('Deploy failed: ' + err.message)
    }
    setDeploying(false)
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { credentials: 'include' })
    window.location.href = '/'
  }

  if (!user) return null   // waiting for user check

  // SCREEN 2: After login, before metadata
  if (step === 'loggedIn' && !loading) {
    return (
      <div className="dashboard">
        <h1>Salesforce Switch</h1>
        <p className="desc">
          This tool provides an interface to easily enable and disable components …
        </p>
        <p className="privacy">None of your organisation information or data is captured…</p>

        <div className="user-box">
          <p>Logged in as:</p>
          <p className="username">{user.username}</p>
          <p className="org">{user.organization}</p>
        </div>

        <div className="action-buttons">
          <button className="btn-logout" onClick={handleLogout}>LOGOUT</button>
          <button className="btn-get-metadata" onClick={handleGetMetadata}>GET METADATA</button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-msg">
          <p>Querying metadata</p>
          <p className="sub">Building a list of validation rules...</p>
        </div>
      </div>
    )
  }

  // SCREEN 3: Rules displayed
  return (
    <div className="dashboard">
      <div className="header">
        <span className="user-info">{user.username} ({user.organization})</span>
        <button className="btn-logout" onClick={handleLogout}>LOGOUT</button>
      </div>

      <p className="instruction">
        Use the Off/On switches and the Enable All/Disable All buttons to specify
        what you want to activate and deactivate for your Org. Once ready, click
        Deploy to apply the changes to your Org.
      </p>

      {message && <div className="message">{message}</div>}

      {/* Tabs */}
      <div className="tabs">
        <span className="tab active">Validation Rules</span>
        <span className="tab disabled">Workflows</span>
        <span className="tab disabled">Process Flows</span>
        <span className="tab disabled">Triggers</span>
      </div>

      <div className="rules-area">
        {Object.keys(grouped).length === 0 && <p>No validation rules found.</p>}
        {Object.keys(grouped).map(obj => (
          <div key={obj} className="object-block">
            <h3>{obj}</h3>
            {grouped[obj].map(rule => (
              <div key={rule.Id} className="rule-row">
                <span className="rule-name">{rule.ValidationName}</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={rule.Active}
                    onChange={() => toggleRule(rule.Id)}
                  />
                  <span className="slider"></span>
                </label>
                <span className={`state ${rule.Active ? 'on' : 'off'}`}>
                  {rule.Active ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
            <div className="obj-actions">
              <button className="btn-small" onClick={() => {
                const ids = grouped[obj].map(r => r.Id)
                setRules(prev => prev.map(r => ids.includes(r.Id) ? { ...r, Active: true } : r))
                setGrouped(prev => ({
                  ...prev,
                  [obj]: prev[obj].map(r => ({ ...r, Active: true }))
                }))
              }}>ENABLE ALL</button>
              <button className="btn-small outline" onClick={() => {
                const ids = grouped[obj].map(r => r.Id)
                setRules(prev => prev.map(r => ids.includes(r.Id) ? { ...r, Active: false } : r))
                setGrouped(prev => ({
                  ...prev,
                  [obj]: prev[obj].map(r => ({ ...r, Active: false }))
                }))
              }}>DISABLE ALL</button>
            </div>
          </div>
        ))}
      </div>

      <div className="global-buttons">
        <button className="btn-enable" onClick={() => setAll(true)}>ENABLE ALL</button>
        <button className="btn-disable" onClick={() => setAll(false)}>DISABLE ALL</button>
        <button className="btn-deploy" onClick={deployChanges} disabled={deploying}>
          {deploying ? 'DEPLOYING...' : 'DEPLOY CHANGES'}
        </button>
      </div>
    </div>
  )
}

export default Dashboard