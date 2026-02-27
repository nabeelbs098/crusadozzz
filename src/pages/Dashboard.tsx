import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

// Helper function to calculate distance in kilometers (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; 
  return distance;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); 
  const [responderLoc, setResponderLoc] = useState<{lat: number, lng: number} | null>(null); // NEW: Tracks responder's GPS

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    setUserId(user.id);

    // 2. Fetch their role AND location from the 'responders' table
    const { data: userData } = await supabase
      .from("responders") 
      .select("role, latitude, longitude") // 👈 NEW: Grab coordinates
      .eq("user_id", user.id) 
      .single();
      
    if (userData) {
      setRole(userData.role);
      if (userData.latitude && userData.longitude) {
        setResponderLoc({ lat: userData.latitude, lng: userData.longitude }); // 👈 NEW: Save coordinates
      }
    }

    fetchAccidents(); 
  };

  const fetchAccidents = async () => {
    const { data: reports } = await supabase
      .from("accident_reports")
      .select("*")
      .neq("status", "resolved") 
      .order("created_at", { ascending: false });
      
    if (reports) {
      setAccidents(reports);
    }
  };

  const acceptAccident = async (reportId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("accident_reports")
      .update({ 
        status: "accepted", 
        assigned_to: userId 
      })
      .eq("id", reportId)
      .eq("status", "pending"); 

    if (error) {
      console.error(error);
      alert("Failed to accept case.");
    } else {
      alert("Case accepted successfully! 🚓");
      fetchAccidents(); 
    }
  };

  const resolveAccident = async (reportId: string) => {
    const isSure = window.confirm("Are you sure you want to mark this emergency as resolved?");
    if (!isSure) return;

    const { error } = await supabase
      .from("accident_reports")
      .update({ 
        status: "resolved" 
      })
      .eq("id", reportId);

    if (error) {
      console.error(error);
      alert("Failed to resolve case.");
    } else {
      alert("Case resolved successfully! Great job. 👏");
      fetchAccidents(); 
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
        <p>No active emergencies currently.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {accidents.map((acc) => (
            <div key={acc.id} style={{ border: "1px solid #444", padding: "20px", borderRadius: "10px", backgroundColor: "#222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontWeight: "bold", color: acc.status === 'pending' ? '#ff9800' : '#4caf50' }}>
                  Status: {acc.status.toUpperCase()}
                </span>
                
                {/* NEW: Displaying the distance instead of just raw coordinates! */}
                <span style={{ fontSize: "0.9em", color: "#888" }}>
                  {responderLoc ? (
                    <strong style={{ color: "#fff" }}>
                      📍 {getDistance(responderLoc.lat, responderLoc.lng, acc.latitude, acc.longitude).toFixed(1)} km away
                    </strong>
                  ) : (
                    `Lat: ${acc.latitude.toFixed(4)}, Lng: ${acc.longitude.toFixed(4)}`
                  )}
                </span>

              </div>
              
              <p><strong>Description:</strong> {acc.description}</p>
              
              {acc.image_url && (
                <img 
                  src={acc.image_url} 
                  alt="Accident scene" 
                  style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "8px", marginTop: "10px", marginBottom: "15px" }} 
                />
              )}

              {/* ROLE-BASED UI LOGIC */}
              {role === "hospital" && (
                <div style={{ padding: "15px", backgroundColor: "#e3f2fd", color: "#0d47a1", textAlign: "center", borderRadius: "5px", fontWeight: "bold" }}>
                  🏥 Prepare Emergency Room
                  <br />
                  <span style={{ fontSize: "0.8em", fontWeight: "normal" }}>
                    {acc.status === "pending" ? "Waiting for responder dispatch..." : "🚑 Responder is en route with patient"}
                  </span>
                </div>
              )}

              {(role === "police" || role === "ambulance") && (
                <>
                  {acc.status === "pending" ? (
                    <button 
                      onClick={() => acceptAccident(acc.id)}
                      style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", width: "100%", fontWeight: "bold", cursor: "pointer", border: "none", borderRadius: "5px" }}
                    >
                      Accept Case
                    </button>
                  ) : acc.assigned_to === userId ? (
                    <button 
                      style={{ backgroundColor: "#2196F3", color: "white", padding: "10px 20px", width: "100%", fontWeight: "bold", cursor: "pointer", border: "none", borderRadius: "5px" }}
                      onClick={() => resolveAccident(acc.id)} 
                    >
                      Mark as Resolved
                    </button>
                  ) : (
                    <div style={{ padding: "10px", backgroundColor: "#333", textAlign: "center", borderRadius: "5px", color: "#aaa" }}>
                      🔒 Accepted by another responder
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}