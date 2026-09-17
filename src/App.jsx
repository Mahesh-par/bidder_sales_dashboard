import { useState, useEffect } from 'react';
import Login from './components/Login';
import BidderDashboard from './components/BidderDashboard';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    // Check if the user is actually a Bidder (if not, maybe we still let them in, but the prompt says 'separate login page for all')
    // Let's just let them in if auth was successful, but ideally they should be a bidder
    if (loggedInUser.role !== 'BIDDER') {
      alert("This portal is only for Bidders.");
      return;
    }
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (!user) {
    return <Login onLogin={handleLogin} roleName="Bidder" />;
  }

  return <BidderDashboard onLogout={handleLogout} user={user} />;
}

export default App;
