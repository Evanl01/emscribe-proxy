"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import * as api from "@/public/scripts/api.js";
import * as ui from "@/public/scripts/ui.js";
import * as format from "@/public/scripts/format.js";
import * as validation from "@/public/scripts/validation.js";
import Auth from "@/src/components/Auth.jsx";

const EmScribeUtils = {
  ...api,
  ...ui,
  ...format,
  ...validation,
};

const ViewTranscripts = () => {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState({});
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transcriptToDelete, setTranscriptToDelete] = useState(null);
  const [message, setMessage] = useState({
    text: "",
    type: "info",
    visible: false,
  });

  // Load all transcripts on mount
  useEffect(() => {
    loadTranscripts();
  }, []);

  // Filter and sort whenever dependencies change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line
  }, [transcripts, search, sortBy, dateFilter]);

  const loadTranscripts = async () => {
    const all = await EmScribeUtils.getAllTranscripts();
    setTranscripts(all);
    setFilteredTranscripts(Object.values(all));
  };

  const applyFilters = () => {
    let filtered = Object.values(transcripts);
    // Search
    if (search.trim()) {
      filtered = filtered.filter(
        (t) =>
          t.text.toLowerCase().includes(search.toLowerCase()) ||
          (t.chiefComplaint || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoffDate;
      switch (dateFilter) {
        case "today":
          cutoffDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          cutoffDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoffDate = null;
      }
      if (cutoffDate) {
        filtered = filtered.filter((t) => t.timestamp >= cutoffDate.getTime());
      }
    }
    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case "oldest":
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case "complaint":
        filtered.sort((a, b) =>
          (a.chiefComplaint || "").localeCompare(b.chiefComplaint || "")
        );
        break;
      case "modified":
        filtered.sort(
          (a, b) =>
            (b.lastModified || b.timestamp) - (a.lastModified || a.timestamp)
        );
        break;
      default:
        break;
    }
    setFilteredTranscripts(filtered);
  };

  const handleSearch = (e) => setSearch(e.target.value);
  const handleSort = (e) => setSortBy(e.target.value);
  const handleDateFilter = (e) => setDateFilter(e.target.value);
  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setDateFilter("all");
  };

  const openViewer = (transcript) => {
    setCurrentTranscript(transcript);
    setViewerOpen(true);
  };
  const closeViewer = () => {
    setViewerOpen(false);
    setCurrentTranscript(null);
  };

  const confirmDelete = (transcript) => {
    setTranscriptToDelete(transcript);
    setShowDeleteModal(true);
  };
  const handleDelete = async () => {
    if (transcriptToDelete) {
      await EmScribeUtils.deleteTranscript(transcriptToDelete.id);
      setTranscripts((prev) => {
        const copy = { ...prev };
        delete copy[transcriptToDelete.id];
        return copy;
      });
      setShowDeleteModal(false);
      setTranscriptToDelete(null);
      setMessage({
        text: "Transcript deleted successfully!",
        type: "success",
        visible: true,
      });
      setTimeout(() => setMessage((m) => ({ ...m, visible: false })), 2000);
    }
  };

  return (
    <>
      <Auth />
      <div className="transcripts-container">
        <header className="page-header">
          <div className="header-content">
            <div className="header-left">
              <button
                className="btn-icon back-btn"
                onClick={() => window.history.back()}
              >
                ← Dashboard
              </button>
              <h1>📄 Transcripts</h1>
            </div>
            <div className="header-actions">
              <div className="search-container">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search transcripts..."
                  className="search-input"
                />
                <button className="btn-icon">🔍</button>
              </div>
              <button className="btn btn-primary">+ New Transcript</button>
            </div>
          </div>
        </header>
        <main className="transcripts-main">
          <div className="filters-section">
            <div className="filters-row">
              <div className="filter-group">
                <label>Sort by:</label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={handleSort}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="complaint">Chief Complaint</option>
                  <option value="modified">Last Modified</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Date Range:</label>
                <select
                  className="filter-select"
                  value={dateFilter}
                  onChange={handleDateFilter}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-outline" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
          <div className="transcripts-content">
            <div className="transcripts-list">
              {filteredTranscripts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>No Transcripts Found</h3>
                  <p>
                    Start by creating your first transcript or adjust your
                    search criteria.
                  </p>
                  <button className="btn btn-primary">
                    Create First Transcript
                  </button>
                </div>
              ) : (
                filteredTranscripts.map((t) => (
                  <div className="transcript-card" key={t.id}>
                    <div className="card-header">
                      <div className="card-title">
                        {EmScribeUtils.formatDisplayName(
                          t.timestamp,
                          t.chiefComplaint
                        )}
                      </div>
                      <div className="card-actions">
                        <button
                          className="btn-icon view-btn"
                          title="View Full Screen"
                          onClick={() => openViewer(t)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon edit-btn"
                          title="Edit"
                          onClick={() =>
                            setMessage({
                              text: "Edit coming soon",
                              type: "info",
                              visible: true,
                            })
                          }
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon soap-btn"
                          title="Generate SOAP"
                          onClick={() =>
                            setMessage({
                              text: "SOAP coming soon",
                              type: "info",
                              visible: true,
                            })
                          }
                        >
                          📋
                        </button>
                        <button
                          className="btn-icon delete-btn"
                          title="Delete"
                          onClick={() => confirmDelete(t)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="card-meta">
                      <span className="meta-item">
                        📅 {EmScribeUtils.formatTimestamp(t.timestamp)}
                      </span>
                      <span className="meta-item">
                        📝 {t.text.split(" ").length} words
                      </span>
                      <span className="meta-item">
                        🏥 {t.chiefComplaint || "No chief complaint"}
                      </span>
                    </div>
                    <div className="card-preview">
                      {t.text.substring(0, 200)}
                      {t.text.length > 200 ? "..." : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Transcript Viewer */}
            {viewerOpen && currentTranscript && (
              <div className="transcript-viewer">
                <div className="viewer-header">
                  <button className="btn-icon" onClick={closeViewer}>
                    ✕
                  </button>
                  <h2>
                    {EmScribeUtils.formatDisplayName(
                      currentTranscript.timestamp,
                      currentTranscript.chiefComplaint
                    )}
                  </h2>
                  <div className="viewer-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        setMessage({
                          text: "Edit coming soon",
                          type: "info",
                          visible: true,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setMessage({
                          text: "SOAP coming soon",
                          type: "info",
                          visible: true,
                        })
                      }
                    >
                      Generate SOAP
                    </button>
                  </div>
                </div>
                <div className="viewer-content">
                  <div className="transcript-meta">
                    <div className="meta-item">
                      <label>Timestamp:</label>{" "}
                      <span>
                        {EmScribeUtils.formatTimestamp(
                          currentTranscript.timestamp
                        )}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Chief Complaint:</label>{" "}
                      <span>
                        {currentTranscript.chiefComplaint || "Not specified"}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Word Count:</label>{" "}
                      <span>{currentTranscript.text.split(" ").length}</span>
                    </div>
                  </div>
                  <div className="transcript-text">
                    <div className="transcript-content">
                      {currentTranscript.text}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Delete Modal */}
          {showDeleteModal && transcriptToDelete && (
            <div className="modal" style={{ display: "flex" }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h3>⚠️ Delete Transcript</h3>
                  <button
                    className="close-btn"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to delete this transcript? This action
                    cannot be undone.
                  </p>
                  <div className="transcript-preview">
                    <strong>
                      {EmScribeUtils.formatDisplayName(
                        transcriptToDelete.timestamp,
                        transcriptToDelete.chiefComplaint
                      )}
                    </strong>
                    <div className="preview-text">
                      {transcriptToDelete.text.substring(0, 100)}...
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Toast Message */}
          {message.visible && (
            <div className={`toast toast-${message.type}`}>{message.text}</div>
          )}
        </main>
      </div>
    </>
  );
};

export default ViewTranscripts;
