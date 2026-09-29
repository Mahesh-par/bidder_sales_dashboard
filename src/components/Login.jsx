import { useState } from 'react';
import { API_BASE_URL } from '../config';

function Login({ onLogin, roleName }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLogin(data.user);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#ececec', fontFamily: 'var(--sans)' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Sign In {roleName ? `- ${roleName}` : ''}</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: '4px', fontWeight: 'bold' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--rule)', borderRadius: '4px' }}
              placeholder="Enter your username"
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: '4px', fontWeight: 'bold' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', paddingRight: '40px', border: '1px solid var(--rule)', borderRadius: '4px' }}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <button type="submit" className="btn solid" style={{ width: '100%', padding: '12px' }}>Login</button>
        </form>

      </div>
    </div>
  );
}

export default Login;
