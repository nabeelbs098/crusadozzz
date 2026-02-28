import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Index() {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!image) return alert("Upload accident image");

    setLoading(true);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const fileName = `public/${Date.now()}-${image.name}`;

      const { error: uploadError } =
        await supabase.storage
          .from("accident-images")
          .upload(fileName, image);

      if (uploadError) {
        alert("Image upload failed");
        setLoading(false);
        return;
      }

      const imageUrl = supabase.storage
        .from("accident-images")
        .getPublicUrl(fileName).data.publicUrl;

      await supabase.from("accident_reports").insert([
        {
          description,
          image_url: imageUrl,
          latitude: lat,
          longitude: lng,
          status: "pending"
        }
      ]);

      alert("Emergency reported successfully!");
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#0b0f1a] to-[#111827] relative">

      {/* Officials Login */}
      <div className="absolute top-6 right-6 z-10">
        <a href="/login">
          <button className="bg-black border border-red-500 px-5 py-2 rounded-xl text-white hover:bg-red-600 transition">
            🛡 Officials Login
          </button>
        </a>
      </div>

      <div className="flex items-center justify-center h-screen px-4">

        <div className="w-full max-w-3xl bg-[#0c111d] border border-red-500/40 rounded-3xl shadow-[0_0_80px_rgba(255,0,0,0.08)] p-10 backdrop-blur-xl">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-600 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-red-900/50">
              🚨
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                ResQnow
              </h2>
              <p className="text-xs text-gray-400">
                Emergency Response Network
              </p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white">
            Incident Reporting Terminal
          </h1>
          <p className="text-gray-400 mt-2 mb-6">
            Instantly coordinate Ambulance • Police • Hospitals
          </p>

          {/* Status Strip */}
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl mb-6 text-sm text-red-300">
            ● System Ready — GPS & Dispatch Active
          </div>

          {/* Upload */}
          <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl mb-4">
            <p className="text-sm text-gray-400 mb-2">
              Upload Incident Image
            </p>
            <input
              type="file"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-white"
            />
          </div>

          {/* Description */}
          <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-400 mb-2">
              Describe the Situation
            </p>
            <textarea
              placeholder="Injuries, vehicles involved, fire, trapped victims..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-transparent text-white outline-none"
            />
          </div>

          {/* Dispatch Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-red-900/30 transition-all"
          >
            🚑 Initiate Emergency Dispatch
          </button>

        </div>
      </div>
    </div>
  );
}
