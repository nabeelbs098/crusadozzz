import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // Adjust path if needed

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Authenticate the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      alert("Login failed: " + authError.message);
      setLoading(false);
      return;
    }

    // 2. Fetch the user's role from your custom 'users' table
    if (authData.user) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (userError) {
        console.error(userError);
        alert("Could not fetch user role.");
      } else if (userData) {
        // 3. Route to the correct dashboard based on role
        if (userData.role === "ambulance") {
          navigate("/dashboard/ambulance");
        } else if (userData.role === "police") {
          navigate("/dashboard/police");
        } else if (userData.role === "hospital") {
          navigate("/dashboard/hospital");
        } else {
          alert("Role not recognized!");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>👮 Officials Login</h2>
      <p>Authorized personnel only.</p>
      
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br/><br/>
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br/><br/>
        
        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Login"}
        </button>
      </form>

      <br/><br/>
      <button onClick={() => navigate("/")}>← Back to Public Portal</button>
    </div>
  );
}