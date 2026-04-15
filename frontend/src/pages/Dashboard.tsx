import "../styles/Dashboard.css";
export default function Dashboard() {
  return (
    <div className="dashboard-container">
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <h1 className="logo">Dashboard</h1>
          <nav className="nav">
            <p className="active">Home</p>
            <p>Join</p>
            <p>Rooms</p>
            <p>Profile</p>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        
        {/* Header */}
        <div className="header">
          <div className="user">
            <div className="avatar" />
            <div>
              <p className="welcome">Welcome Back,</p>
              <h2>Juju</h2>
            </div>
          </div>
          <div className="notif">
            <div className="bell" />
            <span className="dot" />
          </div>
        </div>

        {/* Active Project */}
        <div className="active-project">
          <div className="row">
            <h3>Active Projects</h3>
            <span>More Details →</span>
          </div>
          <div className="project-card">
            <span>Drinkedin</span>
            <span className="badge">Day 3 : On Going</span>
          </div>
        </div>

        {/* Quick Access */}
        <div className="section">
          <h3>Quick Access</h3>
          <div className="grid">
            <div className="card">🚀 Create Room</div>
            <div className="card">👥 Join Room</div>
          </div>
        </div>

        {/* Projects */}
        <div className="section">
          <div className="row">
            <h3>Your Projects Team</h3>
            <span>More Details →</span>
          </div>

          <div className="list-card">
            <div>
              <h4>PitStop+</h4>
              <p>Frontend • 3 months</p>
            </div>
            <span className="badge green">COMPLETED</span>
          </div>

          <div className="list-card">
            <div>
              <h4>Mancingin</h4>
              <p>Fullstack • 1 year</p>
            </div>
            <span className="badge green">COMPLETED</span>
          </div>
        </div>

      </main>
    </div>
  );
}