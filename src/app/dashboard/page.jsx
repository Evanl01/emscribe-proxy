"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/public/scripts/api.js";
import * as ui from "@/public/scripts/ui.js";
import * as format from "@/public/scripts/format.js";
import * as validation from "@/public/scripts/validation.js";
import Auth from "@/src/utils/Auth.jsx";

// Utility object to match the old EmScribeUtils usage
const EmScribeUtils = {
  ...api,
  ...ui,
  ...format,
  ...validation,
};

const Dashboard = () => {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState({});
  const [soapNotes, setSoapNotes] = useState({});
  const [dotPhrases, setDotPhrases] = useState({});
  const [recentTranscripts, setRecentTranscripts] = useState([]);
  const [recentSoap, setRecentSoap] = useState([]);
  const [activeTab, setActiveTab] = useState("transcripts");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({
    apiKeys: {},
    defaultTemplate: "standard",
  });
  const [testBtnState, setTestBtnState] = useState({
    text: "Test Connection",
    disabled: false,
  });

  // Load stats and recent items on mount
  useEffect(() => {
    loadStats();
    loadRecentItems();
  }, []);

  const loadStats = async () => {
    const [t, s, d] = await Promise.all([
      EmScribeUtils.getAllTranscripts({ cache: "no-store" }),
      EmScribeUtils.getAllSoapNotes({ cache: "no-store" }),
      EmScribeUtils.getAllDotPhrases({ cache: "no-store" }),
    ]);
    setTranscripts(t);
    setSoapNotes(s);
    setDotPhrases(d);
  };

  const loadRecentItems = async () => {
    await loadRecentTranscripts();
    await loadRecentSoap();
  };

  const loadRecentTranscripts = async () => {
    const t = await EmScribeUtils.getAllTranscripts({ cache: "no-store" });
    const recent = Object.values(t).slice(0, 5);
    setRecentTranscripts(recent);
  };

  const loadRecentSoap = async () => {
    const s = await EmScribeUtils.getAllSoapNotes({ cache: "no-store" });
    const recent = Object.values(s).slice(0, 5);
    setRecentSoap(recent);
  };

  // Tab switching
  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  // Settings modal handlers
  const openSettingsModal = async () => {
    // Simulate chrome.storage.local.get
    // Replace with your own storage logic if needed
    // For now, just use state
    setSettingsModalOpen(true);
  };
  const closeSettingsModal = () => setSettingsModalOpen(false);
  const saveSettings = async () => {
    // Simulate chrome.storage.local.set
    setSettings({ ...settings });
    EmScribeUtils.showToast("Settings saved successfully!", "success");
    closeSettingsModal();
  };

  // Test connection button
  const testConnections = async () => {
    setTestBtnState({ text: "Testing...", disabled: true });
    // Simulate test
    setTimeout(() => {
      setTestBtnState({ text: "Test Connection", disabled: false });
      EmScribeUtils.showToast("Test complete!", "success");
    }, 1000);
  };

  // Export data (placeholder)
  const exportData = () => {
    EmScribeUtils.showToast("Export feature coming soon!", "info");
  };

  // View/edit handlers (placeholders)
  const viewTranscript = (id) => {
    EmScribeUtils.showToast(`View transcript ${id}`, "info");
  };
  const editTranscript = (id) => {
    EmScribeUtils.showToast(`Edit transcript ${id}`, "info");
  };
  const viewSoapNote = (id) => {
    EmScribeUtils.showToast(`View SOAP note ${id}`, "info");
  };
  const editSoapNote = (id) => {
    EmScribeUtils.showToast(`Edit SOAP note ${id}`, "info");
  };

  // Render
  return (
    <>
      <Auth />
      <div className="dashboard-container">
        <div className="stats">
          <div>Transcripts: {Object.keys(transcripts).length}</div>
          <div>SOAP Notes: {Object.keys(soapNotes).length}</div>
          <div>Dot Phrases: {Object.keys(dotPhrases).length}</div>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn${activeTab === "transcripts" ? " active" : ""}`}
            onClick={() => switchTab("transcripts")}
            data-tab="transcripts"
          >
            Transcripts
          </button>
          <button
            className={`tab-btn${activeTab === "soap" ? " active" : ""}`}
            onClick={() => switchTab("soap")}
            data-tab="soap"
          >
            SOAP Notes
          </button>
        </div>

        <div
          className="tab-content"
          id="transcripts-tab"
          style={{ display: activeTab === "transcripts" ? "block" : "none" }}
        >
          <h3>Recent Transcripts</h3>
          <div id="recentTranscripts">
            {recentTranscripts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <div className="empty-text">No transcripts yet</div>
              </div>
            ) : (
              recentTranscripts.map((transcript) => (
                <div
                  className="recent-item"
                  data-id={transcript.id}
                  key={transcript.id}
                >
                  <div className="recent-icon">📄</div>
                  <div className="recent-content">
                    <div className="recent-title">
                      {EmScribeUtils.formatDisplayName(
                        transcript.created_at,
                        "Placeholder"
                      )}
                    </div>
                    <div className="recent-preview">
                      {(transcript.transcript_text || "").substring(0, 100)}...
                    </div>
                  </div>
                  <div className="recent-actions">
                    <button
                      className="btn-icon view-transcript"
                      title="View"
                      onClick={() => viewTranscript(transcript.id)}
                    >
                      👁️
                    </button>
                    <button
                      className="btn-icon edit-transcript"
                      title="Edit"
                      onClick={() => editTranscript(transcript.id)}
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="tab-content"
          id="soap-tab"
          style={{ display: activeTab === "soap" ? "block" : "none" }}
        >
          <h3>Recent SOAP Notes</h3>
          <div id="recentSoap">
            {recentSoap.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">No SOAP notes yet</div>
              </div>
            ) : (
              recentSoap.map((soap) => (
                <div className="recent-item" data-id={soap.id} key={soap.id}>
                  <div className="recent-icon">📋</div>
                  <div className="recent-content">
                    <div className="recent-title">
                      SOAP Note -{" "}
                      {EmScribeUtils.formatTimestamp(soap.created_at)}
                    </div>
                    <div className="recent-preview">
                      {soap.soapNote_text?.subjective
                        ? soap.soapNote_text.subjective.substring(0, 100) +
                          "..."
                        : "No content"}
                    </div>
                  </div>
                  <div className="recent-actions">
                    <button
                      className="btn-icon view-soap"
                      title="View"
                      onClick={() => viewSoapNote(soap.id)}
                    >
                      👁️
                    </button>
                    <button
                      className="btn-icon edit-soap"
                      title="Edit"
                      onClick={() => editSoapNote(soap.id)}
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-actions">
          <button
            id="viewTranscriptsBtn"
            onClick={() => switchTab("transcripts")}
          >
            View Transcripts
          </button>
          <button
            id="manageDotPhrasesBtn"
            onClick={() =>
              EmScribeUtils.showToast(
                "Dot phrase management coming soon!",
                "info"
              )
            }
          >
            Manage Dot Phrases
          </button>
          <button
            id="newTranscriptBtn"
            onClick={() =>
              EmScribeUtils.showToast("Recording feature coming soon!", "info")
            }
          >
            New Transcript
          </button>
          <button id="settingsBtn" onClick={openSettingsModal}>
            Settings
          </button>
          <button id="exportBtn" onClick={exportData}>
            Export
          </button>
        </div>

        {/* Settings Modal */}
        {settingsModalOpen && (
          <div id="settingsModal" className="modal" style={{ display: "flex" }}>
            <div className="modal-content">
              <h2>Settings</h2>
              <label>
                Whisper API Key:{" "}
                <input
                  id="whisperApiKey"
                  type="text"
                  value={settings.apiKeys.whisper || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      apiKeys: { ...s.apiKeys, whisper: e.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Gemini API Key:{" "}
                <input
                  id="geminiApiKey"
                  type="text"
                  value={settings.apiKeys.gemini || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      apiKeys: { ...s.apiKeys, gemini: e.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Default Template:{" "}
                <input
                  id="defaultTemplate"
                  type="text"
                  value={settings.defaultTemplate || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultTemplate: e.target.value,
                    }))
                  }
                />
              </label>
              <div className="modal-actions">
                <button id="saveSettingsBtn" onClick={saveSettings}>
                  Save
                </button>
                <button id="closeSettingsBtn" onClick={closeSettingsModal}>
                  Close
                </button>
                <button
                  id="testConnectionBtn"
                  onClick={testConnections}
                  disabled={testBtnState.disabled}
                >
                  {testBtnState.text}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
