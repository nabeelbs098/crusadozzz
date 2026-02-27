import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Index() {

  const navigate = useNavigate();

  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  // Upload image
  const uploadImage = async (file: File | null) => {
  if (!file) return null;

  const fileName = Date.now() + "-" + file.name;

  const { error } = await supabase.storage
    .from("accident-images")
    .upload(`public/${fileName}`, file);

  if (error) {
    console.log(error);
    return null;
  }

  const { data } = supabase.storage
    .from("accident-images")
    .getPublicUrl(`public/${fileName}`);

  return data.publicUrl;
};

  // Submit report
  const submitReport = async () => {

    if (!image) {
      alert("Please upload an image");
      return;
    }

    const imageUrl = await uploadImage(image);
if (!imageUrl) return;

navigator.geolocation.getCurrentPosition(async (pos) => {

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  const { error } = await supabase
    .from("accident_reports")
    .insert([
      {
        image_url: imageUrl,
        description: description,
        latitude: lat,
        longitude: lng,
        status: "pending"
      }
    ]);

  if (error) {
    console.log(error);
    alert("Report failed");
  } else {
    alert("Accident Reported Successfully 🚑");
  }
});
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>🚨 RapidRescue</h1>
      <p>Public Accident Reporting Portal</p>
      <p>No login required.</p>

      <hr/><br/>

      <h3>Upload Accident</h3>

      <input
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setImage(e.target.files[0]);
          }
        }}
      /><br/><br/>

      <textarea
        placeholder="Describe accident..."
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
      /><br/><br/>

      <button onClick={submitReport}>
        Submit Report
      </button>

      <br/><br/>

      <button onClick={() => navigate("/login")}>
        Officials Login
      </button>

    </div>
  );
}