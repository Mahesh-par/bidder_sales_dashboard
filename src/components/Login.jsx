import { useState } from 'react';
import { API_BASE_URL } from '../config';

function Login({ onLogin, roleName }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--rule)', borderRadius: '4px' }}
            />
          </div>
          
          <button type="submit" className="btn solid" style={{ width: '100%', padding: '12px' }}>Login</button>
        </form>

      </div>
    </div>
  );
}

export default Login;
