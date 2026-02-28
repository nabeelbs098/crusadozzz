import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

// Helper function to calculate distance in kilometers (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); 
  const [responderLoc, setResponderLoc] = useState<{lat: number, lng: number} | null>(null);
  
  // ✅ Preserved for future Map UI + Fixed Build via Usage in Hospital/Police blocks
  const [ambulanceLoc, setAmbulanceLoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    // Both Hospital and Police need periodic updates to track the assigned ambulance
    if (role === 'hospital' || role === 'police') {
      const interval = setInterval(() => {
        fetchAccidents();
        accidents.forEach(acc => {
          if (acc.assigned_to && acc.status === 'accepted') {
            fetchAmbulanceLocation(acc.assigned_to);
          }
        });
        console.log(`${role} Feed & Ambulance Locations Auto-Refreshed`);
      }, 30000); 
      return () => clearInterval(interval);
    }
  }, [role, accidents]);

  const checkUserAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUserId(user.id);

    const { data: userData } = await supabase
      .from("responders") 
      .select("role, latitude, longitude")
      .eq("user_id", user.id) 
      .single();
      
    if (userData) {
      setRole(userData.role);
      if (userData.latitude && userData.longitude) {
        setResponderLoc({ lat: userData.latitude, lng: userData.longitude });
      }
    }
    fetchAccidents(); 
  };

  const fetchAccidents = async () => {
    const { data: reports } = await supabase
      .from("accident_reports")
      .select("*")
      .neq("status", "resolved");

    if (!reports) return;

    if (role === "ambulance" && responderLoc) {
      const sorted = reports
        .map(acc => ({
          ...acc,
          distance: getDistance(
            responderLoc.lat,
            responderLoc.lng,
            acc.latitude,
            acc.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4); 
      setAccidents(sorted);
    } 
    else {
      const sortedByTime = [...reports].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAccidents(sortedByTime);
    }
  };

  const fetchAmbulanceLocation = async (assignedId: string) => {
    const { data } = await supabase
      .from("responders")
      .select("latitude, longitude")
      .eq("user_id", assignedId)
      .single();

    if (data?.latitude && data?.longitude) {
      setAmbulanceLoc({
        lat: data.latitude,
        lng: data.longitude
      });
      return { lat: data.latitude, lng: data.longitude };
    }
    return null;
  };

  const openLiveTracking = async (assignedId: string) => {
    const loc = await fetchAmbulanceLocation(assignedId);
    if (!loc) {
      alert("Live location not available yet. Ensure the ambulance has GPS enabled.");
      return;
    }
    const mapsUrl = `http://googleusercontent.com/maps.google.com/q=${loc.lat},${loc.lng}`;
    window.open(mapsUrl, "_blank");
  };

  const updateIncidentStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("accident_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      console.error(error);
      alert(`Failed to mark as ${newStatus}`);
    } else {
      alert(`Status updated to ${newStatus.toUpperCase()}`);
      fetchAccidents();
    }
  };

  const acceptAccident = async (reportId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("accident_reports")
      .update({ status: "accepted", assigned_to: userId })
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "white" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
        <h2 style={{ margin: 0 }}>🚨 {role?.toUpperCase()} Dashboard</h2>
        <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Logout</button>
      </div>
      
      <div style={{ background: "#1e1e1e", padding: "15px 20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #333" }}>
        System Status: <strong style={{ textTransform: "uppercase", color: "#4CAF50" }}>Online</strong>
      </div>

      <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        Live Emergency Feed <span style={{ fontSize: "0.6em", background: "#ff4d4d", padding: "2px 8px", borderRadius: "20px" }}>LIVE</span>
      </h3>
      
      {accidents.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666", marginTop: "50px" }}>No active reports in your vicinity.</p>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {accidents.map((acc) => (
            <div key={acc.id} style={{ background: "#1e1e1e", borderRadius: "16px", overflow: "hidden", border: "1px solid #333", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)" }}>
              
              <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
                <span style={{ fontWeight: "800", fontSize: "0.9rem", color: acc.status === 'pending' ? '#ff9800' : '#4caf50' }}>
                  ● {acc.status.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.9rem", color: "#bbb", fontWeight: "600" }}>
                  {responderLoc ? (
                    `📍 ${getDistance(responderLoc.lat, responderLoc.lng, acc.latitude, acc.longitude).toFixed(1)} km away`
                  ) : (
                    `Lat: ${acc.latitude.toFixed(2)}, Lng: ${acc.longitude.toFixed(2)}`
                  )}
                </span>
              </div>
              
              <div style={{ padding: "20px" }}>
                {acc.image_url && (
                  <div style={{ width: "100%", height: "250px", borderRadius: "10px", overflow: "hidden", marginBottom: "15px" }}>
                    <img src={acc.image_url} alt="Accident" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <p style={{ margin: "0 0 20px 0", lineHeight: "1.5" }}>
                  <strong style={{ color: "#888", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Incident Details</strong>
                  {acc.description}
                </p>

                {/* --- 🏥 HOSPITAL VIEW --- */}
                {role === "hospital" && (
                  <div style={{ padding: "15px", backgroundColor: "rgba(33, 150, 243, 0.1)", color: "#2196F3", borderRadius: "8px", border: "1px solid rgba(33, 150, 243, 0.3)" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>🏥 Preparation Alert</div>
                    <div style={{ fontSize: "0.85em", color: "#e0e0e0" }}>
                       Status: {acc.status === "pending" ? "Awaiting dispatch" : "🚑 Ambulance en route"}
                    </div>
                    
                    <button 
                      onClick={() => acc.assigned_to && openLiveTracking(acc.assigned_to)}
                      disabled={!acc.assigned_to}
                      style={{ 
                        marginTop: "10px", 
                        width: "100%", 
                        padding: "8px", 
                        background: acc.assigned_to ? "rgba(33, 150, 243, 0.2)" : "#333", 
                        border: acc.assigned_to ? "1px solid #2196F3" : "1px solid #555", 
                        color: acc.assigned_to ? "#fff" : "#888", 
                        borderRadius: "4px", 
                        fontSize: "0.8rem", 
                        cursor: acc.assigned_to ? "pointer" : "not-allowed" 
                      }}
                    >
                      {acc.assigned_to ? "View Live Ambulance GPS" : "No Ambulance Assigned Yet"}
                    </button>
                  </div>
                )}

                {/* --- 🚓 POLICE VIEW --- */}
                {role === "police" && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "10px", border: "1px solid #333" }}>
                      <strong style={{ fontSize: "0.8rem", color: "#bbb" }}>📍 Incident Location</strong>
                      <div style={{ fontSize: "0.85rem", marginTop: "5px", color: "#fff" }}>
                        Lat: {acc.latitude.toFixed(5)} <br/>
                        Lng: {acc.longitude.toFixed(5)}
                      </div>

                      <button
                        onClick={() => window.open(`http://googleusercontent.com/maps.google.com/q=${acc.latitude},${acc.longitude}`, "_blank")}
                        style={{ marginTop: "8px", padding: "6px", width: "100%", background: "#333", border: "1px solid #555", color: "#fff", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        Open in Google Maps
                      </button>

                      {/* ✅ Live Ambulance Tracking for Police */}
                      {acc.assigned_to && (
                        <button
                          onClick={() => openLiveTracking(acc.assigned_to)}
                          style={{
                            marginTop: "8px",
                            width: "100%",
                            padding: "8px",
                            background: "#1a1a1a",
                            border: "1px solid #444",
                            color: "#2196F3",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            cursor: "pointer"
                          }}
                        >
                          View Live Ambulance GPS
                        </button>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button onClick={() => updateIncidentStatus(acc.id, "resolved")} style={{ backgroundColor: "#4CAF50", color: "white", padding: "12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Solved</button>
                      <button onClick={() => updateIncidentStatus(acc.id, "investigating")} style={{ backgroundColor: "#ff9800", color: "white", padding: "12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Investigate</button>
                    </div>
                  </div>
                )}

                {/* --- 🚑 AMBULANCE VIEW --- */}
                {role === "ambulance" && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ padding: "12px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "10px", border: "1px solid #333" }}>
                      <strong style={{ fontSize: "0.8rem", color: "#bbb" }}>📍 Accident Location</strong>
                      <div style={{ fontSize: "0.85rem", marginTop: "5px", color: "#fff" }}>
                        Lat: {acc.latitude.toFixed(5)} <br/>
                        Lng: {acc.longitude.toFixed(5)}
                      </div>
                      <button
                        onClick={() => window.open(`http://googleusercontent.com/maps.google.com/q=${acc.latitude},${acc.longitude}`, "_blank")}
                        style={{ marginTop: "8px", padding: "6px", width: "100%", background: "#333", border: "1px solid #555", color: "#fff", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        Open in Google Maps
                      </button>
                    </div>

                    {acc.status === "pending" ? (
                      <button onClick={() => acceptAccident(acc.id)} style={{ backgroundColor: "#4CAF50", color: "white", padding: "14px", width: "100%", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Accept Case</button>
                    ) : acc.assigned_to === userId ? (
                      <button onClick={() => updateIncidentStatus(acc.id, "resolved")} style={{ backgroundColor: "#2196F3", color: "white", padding: "14px", width: "100%", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Mark as Resolved</button>
                    ) : (
                      <div style={{ padding: "12px", backgroundColor: "#121212", textAlign: "center", borderRadius: "8px", color: "#555" }}>🔒 Assigned to another unit</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}