"use client";
import { useEffect, useRef, useState } from "react";

export default function PatientEncounterPreviewOverlay({
  isOpen,
  onClose,
  transcript,
  setTranscript,
  soapSubjective,
  setSoapSubjective,
  soapObjective,
  setSoapObjective,
  soapAssessment,
  setSoapAssessment,
  soapPlan,
  setSoapPlan,
  billingSuggestion,
  setBillingSuggestion,
  patientEncounterName,
  setPatientEncounterName,
  onSave,
  isSaving,
  errorMessage,
}) {
  const [previewSection, setPreviewSection] = useState("transcript");

  const transcriptRef = useRef(null);
  const subjectiveRef = useRef(null);
  const objectiveRef = useRef(null);
  const assessmentRef = useRef(null);
  const planRef = useRef(null);
  const billingSuggestionRef = useRef(null);

  const menuSections = [
    { key: "transcript", label: "Transcript" },
    { key: "soapNote", label: "SOAP Note" },
    { key: "billingSuggestion", label: "Billing Suggestion" },
  ];

  const [reviewedSections, setReviewedSections] = useState({
    transcript: false,
    soapNote: false,
    billingSuggestion: false,
  });
  useEffect(() => {
    const refs = [
      transcriptRef,
      billingSuggestionRef,
      subjectiveRef,
      objectiveRef,
      assessmentRef,
      planRef,
    ];
    refs.forEach((ref) => {
      if (ref.current) {
        ref.current.style.height = "auto"; // Reset height
        ref.current.style.height = ref.current.scrollHeight + "px"; // Adjust to content
      }
    });
  }, [
    transcript,
    billingSuggestion,
    soapSubjective,
    soapObjective,
    soapAssessment,
    soapPlan,
  ]);

  // Handle preview navigation
  const handlePreviewNext = () => {
    setReviewedSections((prev) => ({
      ...prev,
      [previewSection]: true,
    }));

    // If on billingSuggestion, go to next unreviewed, else next in order
    if (previewSection === "billingSuggestion") {
      const unreviewed = menuSections.find((s) => !reviewedSections[s.key]);
      if (unreviewed && unreviewed.key !== "billingSuggestion") {
        setPreviewSection(unreviewed.key);
        return;
      }
      onSave();
      return;
    }
    // Otherwise, go to next in order, or save if last
    const idx = menuSections.findIndex((s) => s.key === previewSection);
    if (idx < menuSections.length - 1) {
      setPreviewSection(menuSections[idx + 1].key);
    } else {
      onSave();
    }
  };

  const getNextButtonText = () => {
    // If on billingSuggestion, and not all reviewed, go to next unreviewed
    if (previewSection === "billingSuggestion") {
      const unreviewed = menuSections.find((s) => !reviewedSections[s.key]);
      if (unreviewed)
        return `Next: ${
          menuSections.find((s) => s.key === unreviewed.key).label
        }`;
      return "Save";
    }
    // Otherwise, go to next section in order
    const idx = menuSections.findIndex((s) => s.key === previewSection);
    if (idx < menuSections.length - 1) {
      return `Next: ${menuSections[idx + 1].label}`;
    }
    return "Save";
  };

  // Reset state when overlay closes
  const handleClose = () => {
    setPreviewSection("transcript");
    setReviewedSections({
      transcript: false,
      soapNote: false,
      billingSuggestion: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay background */}
      <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />

      <div className="relative bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <h2 className="text-2xl font-bold">Review Patient Encounter:</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="overflow-x-auto whitespace-nowrap px-0.5 pt-2 border-b border-gray-400">
          <div className="flex w-full">
            {menuSections.map((section) => (
              <button
                key={section.key}
                onClick={() => setPreviewSection(section.key)}
                className={`flex-1 min-w-50 px-6 py-3 text-center font-medium transition-colors
          border border-gray-400 rounded-t-2xl
          ${
            previewSection === section.key
              ? "bg-white text-blue-700 border-b-white"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }
          ${reviewedSections[section.key] ? "font-semibold" : ""}
        `}
                style={{
                  marginBottom: "-1px",
                  zIndex: previewSection === section.key ? 10 : 1,
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {section.label}
                  {reviewedSections[section.key] && (
                    <span className="text-green-500">✓</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row h-0 min-h-0">
          {/* Left side - Content */}
          <div className="flex-1 p-6  h-full overflow-y-auto min-w-0">
            <div className="h-full">
              {previewSection === "transcript" && (
                <pre
                  className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800 mb-10"
                  style={{ minHeight: "10rem", fontFamily: "sans-serif" }}
                >
                  {transcript}
                </pre>
              )}
              {previewSection === "soapNote" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subjective
                    </label>
                    <pre
                      className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800"
                      style={{ minHeight: "4rem", fontFamily: "sans-serif" }}
                    >
                      {soapSubjective}
                    </pre>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objective
                    </label>
                    <pre
                      className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800"
                      style={{ minHeight: "4rem", fontFamily: "sans-serif" }}
                    >
                      {soapObjective}
                    </pre>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment
                    </label>
                    <pre
                      className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800"
                      style={{ minHeight: "4rem", fontFamily: "sans-serif" }}
                    >
                      {soapAssessment}
                    </pre>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan
                    </label>
                    <pre
                      className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800 mb-10"
                      style={{ minHeight: "4rem", fontFamily: "sans-serif" }}
                    >
                      {soapPlan}
                    </pre>
                  </div>
                </div>
              )}
              {previewSection === "billingSuggestion" && (
                <pre
                  className="w-full whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 border text-gray-800 mb-10"
                  style={{ minHeight: "10rem", fontFamily: "sans-serif" }}
                >
                  {billingSuggestion}
                </pre>
              )}

              {/* Spacer for bottom padding */}
              <div className="h-0.5" />
            </div>
          </div>

          {/* Right side - Patient Name and Next Button */}
          <div className="w-full lg:w-80 p-6 flex flex-col bg-gray-50 border-l border-black">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Encounter Name
              </label>
              <input
                type="text"
                value={patientEncounterName}
                onChange={(e) => setPatientEncounterName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter patient encounter name"
                disabled={isSaving}
              />
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <button
                onClick={handlePreviewNext}
                disabled={isSaving}
                className={`w-full px-6 py-3 rounded-lg font-medium ${
                  previewSection === "billingSuggestion"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-600 hover:bg-green-700"
                } text-white ${
                  isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSaving ? "Saving..." : getNextButtonText()}
              </button>

              {errorMessage && (
                <div className="mt-3 text-red-600 text-sm">{errorMessage}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
