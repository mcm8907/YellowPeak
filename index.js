// File: index.js (Node.js Express server for Render)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4"; // or "gpt-3.5-turbo"

app.post("/generate", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    // TODO: Replace this with real DB check
    const mockUser = {
      credits: 10,
      id: token,
    };

    if (mockUser.credits <= 0) {
      return res.status(402).json({ error: "Out of credits" });
    }

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const payload = {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    };

    const openaiRes = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const reply = openaiRes.data.choices[0].message.content;
    const tokenUsage = openaiRes.data.usage.total_tokens || 1000;
    const creditCost = Math.ceil(tokenUsage / 1000); // Simulate billing

    // In production: update user credit balance in DB
    console.log(`User ${token} used ${creditCost} credits.`);

    return res.json({ response: reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
