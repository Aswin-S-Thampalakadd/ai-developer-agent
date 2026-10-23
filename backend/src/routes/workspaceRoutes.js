import { Router } from "express";
import {
  setWorkspace,
  getWorkspace,
  listFiles,
  readWorkspaceFile,
} from "../workspace.js";

const router = Router();

router.post("/open", async (req, res) => {
  try {
    const workspace = await setWorkspace(req.body?.path);

    res.json({
      success: true,
      workspace,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to open project.",
    });
  }
});

router.get("/", (req, res) => {
  res.json({
    workspace: getWorkspace(),
  });
});

router.get("/files", async (req, res) => {
  try {
    const files = await listFiles();

    res.json({ files });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to list project files.",
    });
  }
});

router.get("/file", async (req, res) => {
  try {
    const file = await readWorkspaceFile(req.query.path);

    res.json(file);
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to read project file.",
    });
  }
});

export default router;
