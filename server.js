const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


app.get("/", (req, res) => {
  res.send("Auto Survey Backend Running ");
});


app.post("/survey", async (req, res) => {
  try {
    const {
      mobile_number,
      district,
      gender,
      ...rest
    } = req.body;



    if (!mobile_number) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    if (!district) {
      return res.status(400).json({ error: "District is required" });
    }

    if (!gender) {
      return res.status(400).json({ error: "Gender is required" });
    }
if (!req.body.peak_start_time || !req.body.peak_end_time) {
  return res.status(400).json({ error: "Peak start and end time required" });
}

    const mobile_lookup = crypto
      .createHash("sha256")
      .update(mobile_number)
      .digest("hex");

    const { data: existing, error: lookupError } = await supabase
      .from("auto_survey")
      .select("id")
      .eq("mobile_lookup", mobile_lookup)
      .maybeSingle();

    if (lookupError) {
      return res.status(500).json({ error: lookupError.message });
    }

    if (existing) {
      return res.status(409).json({
        error: "Survey already exists for this mobile number"
      });
    }

    const saltRounds = 10;
    const mobile_hash = await bcrypt.hash(mobile_number, saltRounds);

 
    const { data, error } = await supabase
      .from("auto_survey")
      .insert([
        {
          ...rest,
          district,
          gender,
          mobile_hash,
          mobile_lookup
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: "Survey stored successfully",
      inserted_record: data[0]
    });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});


app.get("/surveys", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("auto_survey")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


const PORT = process.env.PORT || 7373;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});