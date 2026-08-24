import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("WARNING: GEMINI_API_KEY is not defined in the environment variables / .env file.");
}

// We'll initialize the client per request or globally.
// Note: GoogleGenAI or GoogleGenAI class might be imported as { GoogleGenAI } or { GoogleGenerativeAI }
// Actually, in '@google/generative-ai' npm package, the main class is GoogleGenerativeAI.
// Let's verify and import GoogleGenerativeAI.
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(apiKey || "");

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/defog', async (req, res) => {
  const { taskDescription } = req.body;

  if (!taskDescription || taskDescription.trim() === "") {
    return res.status(400).json({ error: "Task description is required." });
  }

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  try {
    // Using gemini-3.5-flash
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const systemInstruction = `You are a world-class productivity coach and task analyst named "TaskDefog".
Your goal is to take a raw list of tasks or thoughts, analyze them, and structure them to minimize cognitive overload and protect the user's mental energy.
Count the number of distinct tasks in the input list. If the number of tasks is greater than 7, you must generate a grounding, friendly, and realistic "realityCheck" banner text to remind the user of their limits. If 7 or fewer, "realityCheck" should be null.

You must return a JSON object with this exact structure:
{
  "realityCheck": "A friendly reality check banner text if there are more than 7 tasks in the list, otherwise null.",
  "top3": [
    {
      "task": "The title of the priority task.",
      "timeEstimate": "Estimated duration (e.g. 15m, 45m, 1h 30m).",
      "details": "A single concrete, actionable next step to start on this task."
    }
  ],
  "quickWins": [
    {
      "task": "A task taking 10 minutes or less.",
      "timeEstimate": "Estimated duration (e.g. 5m, 10m)."
    }
  ],
  "thisWeek": [
    {
      "task": "An important task that should be done this week, but not today.",
      "details": "A brief note or context."
    }
  ],
  "canWait": [
    {
      "task": "A low-priority, optional, or long-term task that can be safely parked.",
      "details": "A brief note or context."
    }
  ],
  "summary": "A warm, encouraging daily summary (1-2 sentences) reflecting the overall focus."
}

Distribute the user's tasks logically. You MUST select and place EXACTLY 3 tasks in the "top3" array if there are 3 or more tasks in the input list. If the user inputs fewer than 3 tasks total, place all of them in the "top3" array. Under no circumstances should you return only 2 tasks in "top3" if 3 or more tasks were provided in the input. Place all remaining tasks in the other lists: "quickWins" (if taking <=10 min), "thisWeek", or "canWait".`;

    const prompt = `Analyze this task:
"${taskDescription}"

Return the JSON output matching the requested schema.`;

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: prompt }
    ]);

    const responseText = result.response.text();
    let parsedData;
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("CRITICAL JSON PARSE ERROR. Raw text returned from Gemini was:");
      console.error(responseText);
      throw parseError;
    }

    res.json(parsedData);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Failed to defog the task. Please check the logs or your API key configuration." });
  }
});

app.listen(PORT, () => {
  console.log(`TaskDefog server is running at http://localhost:${PORT}`);
});
