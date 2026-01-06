const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (html, css)
app.use(express.static(path.join(__dirname, "public")));

// Cloudflare secret key
const CF_SECRET = "0x4AAAAAACK5J7x8KyE8mZkZW8zRbyLtv2o";

// Serve the HTML page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle form submission
app.post("/submit", async (req, res) => {
    const { email, "cf-turnstile-response": token } = req.body;

    if (!token) {
        return res.status(400).send("Captcha missing");
    }

    // Verify Turnstile token
    const verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    const result = await fetch(verifyURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret: CF_SECRET,
            response: token,
            remoteip: req.ip
        })
    }).then(r => r.json());

    if (!result.success) {
        return res.status(400).send("Captcha failed");
    }

    // At this point captcha is valid — process the email
    const { data, error } = await supabase .from("email") // your table name 
    .insert([{ email }]); // insert as object
    if (error) { 
      console.error("Supabase insert error:", error); 
      return res.status(500).send("Database error"); 
    }
    console.log("Inserted row:", data);

    res.send("Email submitted successfully");
});

// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
