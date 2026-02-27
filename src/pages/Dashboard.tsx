import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login"); // Kick them out if not logged in
      return;
    }
    
    // 2. Fetch their role from the 'users' table
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
      
    if (userData) {
      setRole(userData.role);
    }

    // 3. Fetch the live accident reports
    const { data: reports } = await supabase
      .from("accident_reports")
      .select("*")
      .order("created_at", { ascending: false }); // Newest first
      
    if (reports) {
      setAccidents(reports);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🚨 Responder Dashboard</h2>
        <button onClick={handleLogout} style={{ padding: "8px 16px" }}>Logout</button>
      </div>
      
      <p>Logged in as: <strong style={{ textTransform: "uppercase", color: "#4CAF50" }}>{role || "Loading..."}</strong></p>
      <hr />
      
      <h3>Live Accident Feed</h3>
      
      {accidents.length === 0 ? (
        <p>No accidents reported currently.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {accidents.map((acc) => (
            <div key={acc.id} style={{ border: "1px solid #444", padding: "20px", borderRadius: "10px", backgroundColor: "#222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontWeight: "bold", color: acc.status === 'pending' ? '#ff9800' : '#4caf50' }}>
                  Status: {acc.status.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.9em", color: "#888" }}>
                  Lat: {acc.latitude.toFixed(4)}, Lng: {acc.longitude.toFixed(4)}
                </span>
              </div>
              
              <p><strong>Description:</strong> {acc.description}</p>
              
              {acc.image_url && (
                <img 
                  src={acc.image_url} 
                  alt="Accident scene" 
                  style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "8px", marginTop: "10px" }} 
                />
              )}

              {/* We will add the "Accept Case" button here later! */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}