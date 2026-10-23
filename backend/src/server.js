import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:latest";

app.use(cors());

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (req, res) => {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      return res.status(503).json({
        status: "error",
        message: "Ollama is not responding",
      });
    }

    const data = await resp.json();
    const modelAvailable = data.models?.some(
      (model) => model.name === OLLAMA_MODEL
    );

    res.json({
      status: "ok",
      ollama: "connected",
      model: OLLAMA_MODEL,
      modelAvailable,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      ollama: "disconnected",
      message: "Start Ollama and check theat it is running",
    });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({
        error: "Message is empty!, add a message",
      });
    }

    if (
      !Array.isArray(history) ||
      history.length > 20 ||
      history.some(
        (item) =>
          !item ||
          !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" ||
          item.content.length > 20000
      )
    ) {
      return res.status(400).json({
        error: "Invalid conversion history",
      });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI software development assistant. " +
          "Help users write , understand, debug, and improve code. " +
          "Provide practical solutions and explain important decisions. " +
          "Do not claim to have edited files or run commands unless tools actually did so. ",
      },
      ...history,
      { role: "user", content: message.trim() },
    ];

    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!resp.ok) {
      const details = await resp.text();
      return res.status(502).json({
        error: "Ollama failed to generate a response",
        details: details.slice(0, 500),
      });
    }

    const data = await resp.json();

    res.json({
      message: data.message?.content ?? "",
      model: OLLAMA_MODEL,
      done: data.done ?? true,
    });
  } catch (error) {
    const timedOut = error.name === "TimedoutError";
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "The AI request timed out. Try a smaller prompt or model."
        : "Unable to connect to Ollama. Check that Ollama is running.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at the port : ${PORT}`);
});
