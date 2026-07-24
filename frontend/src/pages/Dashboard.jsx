import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
      } catch (err) {
        setError("Session expired or invalid. Please log in again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/login"), 1500);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (error) {
    return <p style={{ color: "red", textAlign: "center", marginTop: "50px" }}>{error}</p>;
  }

  if (!user) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;
  }

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <h2>Dashboard</h2>
      <p><strong>Name:</strong> {user.full_name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Phone:</strong> {user.phone || "N/A"}</p>
      <p><strong>Role:</strong> {user.role}</p>
      <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;