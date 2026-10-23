import { useEffect, useState } from "react";
import { FolderOpen, FileCode, RefreshCw } from "lucide-react";
import "./WorkspacePanel.css";

export default function WorkspacePanel() {
  const [projectPath, setProjectPath] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openProject(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSelectedFile(null);

    try {
      const response = await fetch("/api/workspace/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open project.");
      }

      setWorkspace(data.workspace);
      await loadFiles();
    } catch (err) {
      setError(err.message);
      setWorkspace(null);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    const response = await fetch("/api/workspace/files");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load files.");
    }

    setFiles(data.files);
  }

  async function openFile(filePath) {
    setError("");

    try {
      const response = await fetch(
        `/api/workspace/file?path=${encodeURIComponent(filePath)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open file.");
      }

      setSelectedFile(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    async function restoreWorkspace() {
      try {
        const response = await fetch("/api/workspace");
        const data = await response.json();

        if (data.workspace) {
          setWorkspace(data.workspace);
          setProjectPath(data.workspace.path);
          await loadFiles();
        }
      } catch {
        setError("Unable to connect to the workspace API.");
      }
    }

    restoreWorkspace();
  }, []);

  return (
    <section className="workspace-panel">
      <div className="workspace-header">
        <FolderOpen size={18} />
        <h2>Project Explorer</h2>
      </div>

      <form className="workspace-form" onSubmit={openProject}>
        <input
          value={projectPath}
          onChange={(event) => setProjectPath(event.target.value)}
          placeholder="/home/your-user/my-project"
          aria-label="Project directory path"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Opening..." : "Open Project"}
        </button>
      </form>

      {error && <p className="workspace-error">{error}</p>}

      {workspace && (
        <>
          <div className="workspace-project">
            <span>{workspace.name}</span>
            <button
              type="button"
              className="workspace-refresh"
              onClick={() => loadFiles().catch((err) => setError(err.message))}
              title="Refresh file list"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="workspace-content">
            <div className="workspace-file-list">
              {files.map((file) => (
                <button
                  type="button"
                  key={file.path}
                  className={`workspace-file ${
                    selectedFile?.path === file.path ? "selected" : ""
                  }`}
                  onClick={() => openFile(file.path)}
                  title={file.path}
                >
                  <FileCode size={15} />
                  <span>{file.path}</span>
                </button>
              ))}

              {files.length === 0 && (
                <p className="workspace-empty">No readable files found.</p>
              )}
            </div>

            <div className="workspace-viewer">
              {selectedFile ? (
                <>
                  <div className="workspace-file-title">
                    {selectedFile.path}
                  </div>
                  <pre>
                    <code>{selectedFile.content}</code>
                  </pre>
                </>
              ) : (
                <p className="workspace-empty">
                  Select a file to view its code.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
