import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Shield, Camera, Send, Info } from "lucide-react";
import { supabase } from "../lib/supabase";

// Helper function for the Dispatch Engine
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

export default function Index() {
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIC STARTS HERE ---
  const uploadImage = async (file: File | null) => {
    if (!file) return null;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("accident-images").upload(`public/${fileName}`, file);
    if (error) {
      console.error(error);
      return null;
    }
    const { data } = supabase.storage.from("accident-images").getPublicUrl(`public/${fileName}`);
    return data.publicUrl;
  };

  const submitReport = async () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const imageUrl = await uploadImage(image);
      if (!imageUrl) throw new Error("Image upload failed");

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;

        // 1. Save Report
        const { data: accidentData, error: accidentError } = await supabase
          .from("accident_reports")
          .insert([{ image_url: imageUrl, description, latitude: lat, longitude: lng, status: "pending" }])
          .select()
          .single();

        if (accidentError) throw accidentError;

        // 2. Dispatch Closest Responders
        const { data: responders } = await supabase.from("responders").select("*");
        
        if (responders && responders.length > 0) {
          const sorted = responders
            .map(r => ({ ...r, dist: getDistance(lat, lng, r.latitude, r.longitude) }))
            .sort((a, b) => a.dist - b.dist);

          const targets = [
            sorted.find(r => r.role === "hospital"),
            sorted.find(r => r.role === "police"),
            ...sorted.filter(r => r.role === "ambulance").slice(0, 3)
          ].filter(Boolean);

          const tickets = targets.map(t => ({ accident_id: accidentData.id, responder_id: t.user_id }));
          await supabase.from("dispatches").insert(tickets);
        }

        alert("HELP DISPATCHED! Nearest units are on the way. 🚑");
        setImage(null);
        setDescription("");
      });
    } catch (err) {
      console.error(err);
      alert("System error during dispatch.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- LOGIC ENDS HERE ---

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter italic">RapidRescue</span>
          </div>
          <button onClick={() => navigate("/login")} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-600 transition-all font-bold text-sm">
            <Shield className="h-4 w-4 inline mr-2" /> Officials Login
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent text-center">
            Report Accident
          </h1>
          <p className="text-gray-400 text-lg text-center">Immediate dispatch of nearest emergency units.</p>
        </div>

        <div className="bg-[#141414] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
          
          <div className="space-y-10">
            <div className="relative group">
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all ${image ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 group-hover:border-red-500/40'}`}>
                <Camera className={`h-14 w-14 mx-auto mb-4 ${image ? 'text-green-500' : 'text-gray-500'}`} />
                <p className="text-lg font-bold text-gray-300">{image ? image.name : "Capture Accident Image"}</p>
              </div>
            </div>

            <textarea
              placeholder="Describe the incident (Injuries, vehicles, hazards)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 min-h-[160px] text-lg focus:ring-2 focus:ring-red-600/50 transition-all outline-none"
            />

            <button
              onClick={submitReport}
              disabled={isSubmitting}
              className="w-full py-6 rounded-2xl bg-red-600 hover:bg-red-700 font-black text-xl transition-all shadow-[0_15px_30px_-5px_rgba(220,38,38,0.5)] flex items-center justify-center gap-4 disabled:bg-gray-800"
            >
              {isSubmitting ? "INITIATING DISPATCH..." : <><Send className="h-6 w-6" /> DISPATCH HELP NOW</>}
            </button>
          </div>
        </div>

        <div className="mt-10 flex justify-center items-center gap-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-300/60 text-sm">
          <Info className="h-5 w-5 text-blue-400 shrink-0" />
          <span>Precise GPS coordinates will be sent to the nearest responder.</span>
        </div>
      </main>
    </div>
  );
}