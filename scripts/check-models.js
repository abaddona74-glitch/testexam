const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually read .env
function getEnvValue(key) {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const parts = line.split('=');
            if (parts[0].trim() === key) {
                return parts.slice(1).join('=').trim();
            }
        }
    } catch (e) {
        console.log("Could not read .env file", e.message);
    }
    return null;
}

async function listModels() {
  const apiKey = getEnvValue('GOOGLE_API_KEY');
  
  if (!apiKey) {
      console.log("No API Key found.");
      return;
  }

  console.log("Fetching available models via REST API...");
  try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) {
          console.log(`HTTP Error: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.log(text);
          return;
      }
      const data = await response.json();
      console.log("Available Models:");
      if (data.models) {
          data.models.forEach(m => {
              console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
          });
      } else {
          console.log("No models found in response.");
      }

  } catch (error) {
      console.log("Fetch error:", error);
  }
}

listModels();
