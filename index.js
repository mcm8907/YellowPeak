// File: index.js (Render backend with Supabase + OpenAI integration)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = "gpt-4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper: Deduct credit for user by token
async function deductCredit(userToken) {
  const { data: user, error } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userToken)
    .single();

  if (error || !user || user.credits <= 0) {
    throw new Error("❌ User not found or out of credits");
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ credits: user.credits - 1 })
    .eq("id", userToken);

  if (updateError) throw new Error("❌ Failed to update credits");
  return true;
}

// Helper: Call OpenAI
async function callOpenAI(prompt) {
  const payload = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
  };

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    payload,
    { headers }
  );

  return response.data.choices[0].message.content;
}

// API Endpoint: Generate email content
app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userToken = authHeader.split(" ")[1];
    await deductCredit(userToken);

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const result = await callOpenAI(prompt);
    return res.json({ result });
  } catch (err) {
    console.error("/generate error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.send("Yellow Peak backend is running ✅");
});

app.listen(PORT, () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
