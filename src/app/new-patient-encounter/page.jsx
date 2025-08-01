"use client";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import * as api from "@/public/scripts/api.js";
import * as ui from "@/public/scripts/ui.js";
import * as format from "@/public/scripts/format.js";
import * as validation from "@/public/scripts/validation.js";
import { createClient } from "@supabase/supabase-js";
// import * as auth  from "@/src/utils/Auth.jsx";
import Auth from "@/src/utils/Auth.jsx";
import PatientEncounterPreviewOverlay from "@/src/components/PatientEncounterPreviewOverlay";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewPatientEncounter() {
  const router = useRouter();

  // State management
  const [activeSection, setActiveSection] = useState("upload");
  const [recordingFile, setRecordingFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  // Persistent fields
  const [transcript, setTranscript] = useState("");
  const [soapSubjective, setSoapSubjective] = useState("");
  const [soapObjective, setSoapObjective] = useState("");
  const [soapAssessment, setSoapAssessment] = useState("");
  const [soapPlan, setSoapPlan] = useState("");
  const [billingSuggestion, setBillingSuggestion] = useState("");
  const [patientEncounterName, setPatientEncounterName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewSection, setPreviewSection] = useState("transcript");
  const [reviewedSections, setReviewedSections] = useState({
    transcript: false,
    soapNote: false,
    billingSuggestion: false,
  });

  // For rich text editing
  const handleEditableChange = (setter) => (e) => {
    setter(e.target.innerHTML);
  };

  // LocalStorage keys
  const LS_KEYS = {
    patientEncounterName: "emscribe_patientEncounterName",
    transcript: "emscribe_transcript",
    soapSubjective: "emscribe_soapSubjective",
    soapObjective: "emscribe_soapObjective",
    soapAssessment: "emscribe_soapAssessment",
    soapPlan: "emscribe_soapPlan",
    billingSuggestion: "emscribe_billingSuggestion",
  };
  // Restore from localStorage on mount and enable Section 2 if any field exists
  useEffect(() => {
    const name = localStorage.getItem(LS_KEYS.patientEncounterName) || "";
    const transcript = localStorage.getItem(LS_KEYS.transcript) || "";
    const subjective = localStorage.getItem(LS_KEYS.soapSubjective) || "";
    const objective = localStorage.getItem(LS_KEYS.soapObjective) || "";
    const assessment = localStorage.getItem(LS_KEYS.soapAssessment) || "";
    const plan = localStorage.getItem(LS_KEYS.soapPlan) || "";
    const billing = localStorage.getItem(LS_KEYS.billingSuggestion) || "";
    setPatientEncounterName(name);
    setTranscript(transcript);
    setSoapSubjective(subjective);
    setSoapObjective(objective);
    setSoapAssessment(assessment);
    setSoapPlan(plan);
    setBillingSuggestion(billing);
    // If any field has data, enable section 2
    if (
      name.trim() ||
      transcript.trim() ||
      subjective.trim() ||
      objective.trim() ||
      assessment.trim() ||
      plan.trim() ||
      billing.trim()
    ) {
      setSoapNoteRequested(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEYS.patientEncounterName, patientEncounterName);
  }, [patientEncounterName]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.transcript, transcript);
  }, [transcript]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.soapSubjective, soapSubjective);
  }, [soapSubjective]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.soapObjective, soapObjective);
  }, [soapObjective]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.soapAssessment, soapAssessment);
  }, [soapAssessment]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.soapPlan, soapPlan);
  }, [soapPlan]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.billingSuggestion, billingSuggestion);
  }, [billingSuggestion]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // New: Track if save was attempted
  const [saveAttempted, setSaveAttempted] = useState(false);

  // Track if SOAP note generation has started
  const [soapNoteRequested, setSoapNoteRequested] = useState(false);

  // Error message for missing fields
  const [errorMessage, setErrorMessage] = useState("");

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Audio playback state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioLoadingState, setAudioLoadingState] = useState("idle");

  // Update audioUrl when recordingFile changes
  useEffect(() => {
    if (recordingFile) {
      const url = URL.createObjectURL(recordingFile);
      setAudioUrl(url);
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setAudioLoaded(false);
      setAudioLoadingState("loading");

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setAudioLoaded(false);
      setAudioLoadingState("idle");
    }
  }, [recordingFile]);

  // Audio event handlers
  const handleAudioLoadStart = () => {
    setAudioLoadingState("loading");
  };

  const handleAudioLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      const duration = audioPlayerRef.current.duration;

      if (isFinite(duration) && duration > 0) {
        setAudioDuration(duration);
        setAudioLoaded(true);
        setAudioLoadingState("loaded");
      } else {
        // For WebM files with invalid duration, use recorded duration as fallback
        setAudioDuration(recordingDuration || 0);
        setAudioLoaded(true);
        setAudioLoadingState("loaded");
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioPlayerRef.current) {
      const currentTime = audioPlayerRef.current.currentTime;
      setAudioCurrentTime(currentTime);

      // For WebM files with invalid duration, update duration based on playback
      if (!isFinite(audioDuration) || audioDuration === 0) {
        const realDuration = audioPlayerRef.current.duration;
        if (isFinite(realDuration) && realDuration > 0) {
          setAudioDuration(realDuration);
        } else if (currentTime > audioDuration) {
          setAudioDuration(currentTime + 1);
        }
      }
    }
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);

    // For WebM files, get the final duration when playback ends
    if (audioPlayerRef.current) {
      const finalTime = audioPlayerRef.current.currentTime;
      setAudioDuration(finalTime);
      setAudioCurrentTime(0);
    } else {
      setAudioCurrentTime(0);
    }
  };

  const handleAudioError = (e) => {
    const error = e.target.error;
    let errorMessage = "Unknown audio error";
    if (error) {
      switch (error.code) {
        case 1:
          errorMessage = "Audio loading was aborted";
          break;
        case 2:
          errorMessage = "Network error occurred while loading audio";
          break;
        case 3:
          errorMessage = "Audio decoding error - file may be corrupted";
          break;
        case 4:
          errorMessage = "Audio format not supported by browser";
          break;
        default:
          errorMessage = `Audio error (code: ${error.code})`;
      }
    }

    setAudioLoadingState("error");
    setAudioLoaded(false);
    alert(`Error loading audio: ${errorMessage}`);
  };

  // File validation
  const validateFile = (file) => {
    const validTypes = [
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "video/mp4", // Add MP4 support
      "audio/mp4", // Add MP4 audio support
      "audio/m4a", // Add M4A support
      "audio/x-m4a", // Add alternative M4A MIME type
    ];
    if (!validTypes.some((type) => file.type.includes(type))) {
      return "File must be in a supported audio format (MP3, WAV, WebM, OGG, MP4, M4A)";
    }
    if (file.size > 30 * 1024 * 1024) {
      // 30MB
      return "File size must be less than 30MB";
    }
    return null;
  };

  // Get audio duration
  const getAudioDuration = (file) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("error", onError);
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      };

      const onLoadedMetadata = () => {
        cleanup();
        if (isFinite(audio.duration) && audio.duration > 0) {
          resolve(audio.duration);
        } else {
          reject(new Error(`Invalid audio duration: ${audio.duration}`));
        }
      };

      const onError = (e) => {
        cleanup();
        reject(new Error("Could not load audio file for duration check"));
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("error", onError);
      audio.src = URL.createObjectURL(file);

      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error("Timeout loading audio metadata"));
      }, 10000);
    });
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    // Clear old recording file from localStorage and reset local variable
    localStorage.removeItem("emscribe_audioFileMetadata");
    setRecordingFile(null);
    setRecordingDuration(0);

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const duration = await getAudioDuration(file);
      if (duration > 40 * 60) {
        // 40 minutes
        alert("Recording duration must be less than 40 minutes");
        return;
      }

      // Show uploading status
      setCurrentStatus({ status: "info", message: "Uploading recording..." });
      setIsSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to upload files.");
        router.push("/login");
        return;
      }
      const userEmail = user.email;
      // Get extension from uploaded file name
      // Always derive extension from uploaded file name, fallback to empty string if not found
      const originalName = file.name || "audio";
      const lastDot = originalName.lastIndexOf(".");
      const extension =
        lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : "";
      const fileName = `${userEmail}-${Date.now()}-${Math.floor(
        Math.random() * 100
      )
        .toString()
        .padStart(2, "0")}${extension ? `.${extension}` : ""}`;
      const filePath = `${user?.id || "anonymous"}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("audio-files")
        .upload(filePath, file, { upsert: false });
      setIsSaving(false);
      if (error) {
        setCurrentStatus({ status: "error", message: error.message });
        alert("Error uploading to Supabase: " + error.message);
        return;
      }
      // Save metadata for later use
      const metadata = {
        path: data.path,
        id: data.id,
        fullPath: data.fullPath,
      };
      console.log("File uploaded successfully:", metadata);
      localStorage.setItem(
        "emscribe_audioFileMetadata",
        JSON.stringify(metadata)
      );
      setRecordingFile(file);
      setRecordingDuration(duration);
      // Show 'Recording Ready' after upload completes
      setCurrentStatus({ status: "success", message: "Recording Ready" });
    } catch (error) {
      setIsSaving(false);
      setCurrentStatus({ status: "error", message: error.message });
      console.error("Error processing or uploading audio file:", error);
      alert(
        "Error processing or uploading audio file. Please ensure it's a valid audio file."
      );
    }
  };

  // Audio control functions
  const playAudio = async () => {
    if (audioPlayerRef.current && audioLoaded) {
      try {
        await audioPlayerRef.current.play();
        setAudioPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        alert(`Error playing audio: ${error.message}`);
      }
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setAudioPlaying(false);
    }
  };

  const seekAudio = (time) => {
    if (audioPlayerRef.current && audioLoaded) {
      // For WebM files with invalid duration, allow seeking within reasonable bounds
      const maxSeekTime = isFinite(audioDuration)
        ? audioDuration
        : recordingDuration || time;
      const seekTime = Math.min(time, maxSeekTime);

      audioPlayerRef.current.currentTime = seekTime;
      setAudioCurrentTime(seekTime);
    }
  };

  // Start recording
  const startRecording = async () => {
    // Clear previous recording file and duration, and remove from localStorage
    localStorage.removeItem("emscribe_audioFileMetadata");
    setRecordingFile(null);
    setRecordingDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new window.MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const recordingFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });
        setRecordingFile(recordingFile);
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= 40 * 60) {
            // 40 minutes max
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please check permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Generate SOAP note
  // Update the generateSoapNote function to handle recorded audio upload
  const generateSoapNote = async () => {
    // Clear localStorage and reset textareas
    Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));
    setPatientEncounterName("");
    setTranscript("");
    setSoapSubjective("");
    setSoapObjective("");
    setSoapAssessment("");
    setSoapPlan("");
    setBillingSuggestion("");

    setSoapNoteRequested(true);
    setIsProcessing(true);
    setActiveSection("review");
    setCurrentStatus({
      status: "processing",
      message: "Starting transcription...",
    });

    try {
      let audioFilePath = "";

      // Check if we have existing uploaded file metadata
      const metadataStr = localStorage.getItem("emscribe_audioFileMetadata");

      if (metadataStr) {
        // File was uploaded - use existing metadata
        const metadata = JSON.parse(metadataStr);
        if (!metadata.path) {
          throw new Error("Audio file path missing in metadata.");
        }
        audioFilePath = metadata.path;
      } else if (recordingFile) {
        // File was recorded - need to upload it first
        setCurrentStatus({
          status: "info",
          message: "Uploading recorded audio...",
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("You must be logged in to upload files.");
        }

        const userEmail = user.email;
        // Get extension from locally recorded file name
        // Always derive extension from locally recorded file name, fallback to empty string if not found
        let extension = "";
        if (recordingFile && recordingFile.name) {
          const lastDot = recordingFile.name.lastIndexOf(".");
          if (lastDot !== -1)
            extension = recordingFile.name.substring(lastDot + 1).toLowerCase();
        }
        const fileName = `${userEmail}-${Date.now()}-${Math.floor(
          Math.random() * 100
        )
          .toString()
          .padStart(2, "0")}${extension ? `.${extension}` : ""}`;
        const filePath = `${user?.id || "anonymous"}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("audio-files")
          .upload(filePath, recordingFile, { upsert: false });

        if (error) {
          throw new Error(`Error uploading recorded audio: ${error.message}`);
        }

        // Save metadata for later use
        const metadata = {
          path: data.path,
          id: data.id,
          fullPath: data.fullPath,
        };
        console.log("Recorded file uploaded successfully:", metadata);
        localStorage.setItem(
          "emscribe_audioFileMetadata",
          JSON.stringify(metadata)
        );
        audioFilePath = data.path;

        setCurrentStatus({
          status: "processing",
          message: "Audio uploaded, starting transcription...",
        });
      } else {
        throw new Error(
          "No audio file found. Please upload or record audio first."
        );
      }

      // Now proceed with the API call using audioFilePath
      const payload = { audio_file_path: audioFilePath };
      const response = await fetch("/api/prompt-llm", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.getJWT()}`,
        },
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += `\n${errorData}`;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      if (!response.body || !response.body.getReader) {
        throw new Error("No readable response body received from server");
      }

      // Rest of the streaming response handling remains the same...
      const reader = response.body.getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          console.log("Received line:", line);
          if (line.trim()) {
            try {
              let jsonData;
              if (line.startsWith("data: ")) {
                const jsonString = line.substring(6);
                if (jsonString.trim()) {
                  jsonData = JSON.parse(jsonString);
                }
              } else {
                jsonData = JSON.parse(line);
              }
              if (jsonData) {
                setCurrentStatus(jsonData);
                if (
                  jsonData.status === "transcription complete" &&
                  jsonData.data?.transcript
                ) {
                  setTranscript(jsonData.data.transcript);
                }
                if (
                  jsonData.status === "soap note complete" &&
                  jsonData.data?.soapNote
                ) {
                  // Set S/O/A/P fields individually
                  if (jsonData.data.soapNote) {
                    const note = jsonData.data.soapNote;
                    console.log("SOAP Note data:", note);
                    let soapSubjectiveText = format.cleanMarkdownText(
                      "",
                      note.subjective,
                      0,
                      "1.25em"
                    );
                    let soapObjectiveText = format.cleanMarkdownText(
                      "",
                      note.objective,
                      0,
                      "1.25em"
                    );
                    let soapAssessmentText = format.cleanMarkdownText(
                      "",
                      note.assessment,
                      0,
                      "1.25em"
                    );
                    let soapPlanText = format.cleanMarkdownText(
                      "",
                      note.plan,
                      0,
                      "1.25em"
                    );
                    setSoapSubjective(soapSubjectiveText);
                    setSoapObjective(soapObjectiveText);
                    setSoapAssessment(soapAssessmentText);
                    setSoapPlan(soapPlanText);
                  }

                  // Format Billing Suggestion: pass the entire object to cleanMarkdownText
                  if (jsonData.data.billingSuggestion) {
                    let billingText = format.cleanMarkdownText(
                      "",
                      jsonData.data.billingSuggestion,
                      0,
                      "1.25em"
                    );
                    setBillingSuggestion(billingText);
                  }

                  setIsProcessing(false);
                }
              }
            } catch (e) {}
          }
        }
      }
      if (buffer.trim()) {
        try {
          let jsonData;
          if (buffer.startsWith("data: ")) {
            const jsonString = buffer.substring(6);
            if (jsonString.trim()) {
              jsonData = JSON.parse(jsonString);
            }
          } else {
            jsonData = JSON.parse(buffer);
          }
          if (jsonData) {
            setCurrentStatus(jsonData);
          }
        } catch (e) {}
      }
    } catch (error) {
      setCurrentStatus({
        status: "error",
        message: `Failed to process recording: ${error.message}`,
      });
      setIsProcessing(false);
    }
  };

  // Save transcript and note
  const saveTranscriptAndNote = async () => {
    setSaveAttempted(true);
    const missingFields = [];
    if (!patientEncounterName.trim())
      missingFields.push("Patient Encounter Name");
    if (!transcript.trim()) missingFields.push("Transcript");
    if (!soapSubjective.trim()) missingFields.push("Subjective");
    if (!soapObjective.trim()) missingFields.push("Objective");
    if (!soapAssessment.trim()) missingFields.push("Assessment");
    if (!soapPlan.trim()) missingFields.push("Plan");
    if (!billingSuggestion.trim()) missingFields.push("Billing Suggestion");
    if (missingFields.length > 0) {
      alert(
        "Required field(s): " + missingFields.map((f) => `${f}`).join(", ")
      );
      return;
    }

    setIsSaving(true);

    try {
      // Clear localStorage for these fields after successful save
      // Recompile SOAP Note JSON object
      const soapNoteObject = {
        subjective: soapSubjective.replace(/\r?\n/g, "\n"),
        objective: soapObjective.replace(/\r?\n/g, "\n"),
        assessment: soapAssessment.replace(/\r?\n/g, "\n"),
        plan: soapPlan.replace(/\r?\n/g, "\n"),
      };

      // Attempt to parse billingSuggestion into JSON object with 3 fields
      // If not possible, fallback to string
      let billingSuggestionObject = {};
      // Try to extract fields by simple regex (ICD10, CPT, additional_inquiries)
      const icdMatch = billingSuggestion.match(
        /icd10[:\s]*([\s\S]*?)(cpt[:\s]|additional_inquiries[:\s]|$)/i
      );
      const cptMatch = billingSuggestion.match(
        /cpt[:\s]*([\s\S]*?)(icd10[:\s]|additional_inquiries[:\s]|$)/i
      );
      const addMatch = billingSuggestion.match(
        /additional_inquiries[:\s]*([\s\S]*?)(icd10[:\s]|cpt[:\s]|$)/i
      );
      billingSuggestionObject.icd10 = icdMatch
        ? icdMatch[1].trim().replace(/\r?\n/g, "\n")
        : "";
      billingSuggestionObject.cpt = cptMatch
        ? cptMatch[1].trim().replace(/\r?\n/g, "\n")
        : "";
      billingSuggestionObject.additional_inquiries = addMatch
        ? addMatch[1].trim().replace(/\r?\n/g, "\n")
        : "";

      // Use new complete endpoint for mass save

      const formData = new FormData();
      formData.append("name", patientEncounterName);
      // Get audio_file_path from localStorage metadata
      const audioFileMetadata = localStorage.getItem(
        "emscribe_audioFileMetadata"
      );
      let audio_file_path = "";
      if (audioFileMetadata) {
        try {
          const metadataObj = JSON.parse(audioFileMetadata);
          audio_file_path = metadataObj.path || "";
        } catch (e) {
          audio_file_path = "";
        }
      }
      formData.append("audio_file_path", audio_file_path);
      formData.append("transcript_text", transcript);
      //merge SOAP note and billing suggestion into soapNote_text jsonObject
      let soapNoteText = JSON.stringify({
        soapNote: soapNoteObject,
        billingSuggestion: billingSuggestionObject,
      });
      formData.append("soapNote_text", soapNoteText);

      console.log("Saving patient encounter with data:", {
        name: patientEncounterName,
        recording: recordingFile,
        transcript_text: transcript,
        soapNote_text: soapNoteText,
      });
      const response = await fetch("/api/patient-encounters/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getJWT()}`,
        },
        body: formData,
      });
      console.log("Save response:", response);

      if (!response.ok) {
        let detailedError = `Failed to save patient encounter: ${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            detailedError += `\nServer response: ${errorText}`;
          }
          console.error(detailedError);
        } catch (e) {
          detailedError += `\nError reading server response: ${e.message}`;
        }
        alert(detailedError);
        setIsSaving(false);
        return;
      }
      // Clear localStorage for these fields after successful save
      Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));
      // Navigate back to dashboard
      setPatientEncounterName("");
      setTranscript("");
      setSoapSubjective("");
      setSoapObjective("");
      setSoapAssessment("");
      setSoapPlan("");
      setBillingSuggestion("");
      setIsSaving(false);
      //reload page
      window.location.reload();
    } catch (error) {
      let debugMsg = "Error saving data: " + error.message;
      if (error.stack) {
        debugMsg += "\nStack trace: " + error.stack;
      }
      alert(debugMsg);
      setIsSaving(false);
    }
  };

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Auth />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">New Recording</h1>

        {/* Section 1: Upload/Record */}
        <div className="border border-gray-200 rounded-lg mb-4">
          <button
            className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
            onClick={() =>
              setActiveSection(activeSection === "upload" ? "upload" : "upload")
            }
          >
            <span className="text-lg font-semibold">
              1. Upload or Record Audio
            </span>
            <span className="text-xl">
              {activeSection === "upload" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "upload" && (
            <div className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Upload Recording</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="audio/*,video/mp4,.mp4,.m4a" // Updated to include MP4 and M4A
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isRecording || isProcessing}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                      <div className="text-4xl mb-2">📁</div>
                      <div>Click to upload audio file</div>
                      <div className="text-sm text-gray-500 mt-2">
                        Max 30MB, 40 minutes duration
                        <br />
                        Supports MP3, WAV, WebM, OGG, MP4, M4A
                      </div>
                    </label>
                  </div>
                </div>

                {/* Recording Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Record Audio</h3>
                  <div className="text-center space-y-4">
                    <div className="text-2xl">{isRecording ? "🔴" : "🎤"}</div>

                    {isRecording && (
                      <div className="text-lg font-mono">
                        {formatDuration(recordingDuration)} / 40:00
                      </div>
                    )}

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`px-6 py-3 rounded-lg font-medium ${
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } disabled:opacity-50`}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                  </div>
                </div>
              </div>

              {recordingFile && !isRecording && (
                <div
                  className={`mt-6 p-4 rounded-lg border ${
                    currentStatus?.status === "info" &&
                    currentStatus?.message === "Uploading recording..."
                      ? "bg-gray-100 border-gray-300 opacity-60 pointer-events-none select-none"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          currentStatus?.status === "info" &&
                          currentStatus?.message === "Uploading recording..."
                            ? "text-gray-500"
                            : "text-green-800"
                        }`}
                      >
                        {currentStatus?.status === "info" &&
                        currentStatus?.message === "Uploading recording..."
                          ? "Uploading recording..."
                          : "Recording Ready"}
                      </p>
                      <p
                        className={`text-sm ${
                          currentStatus?.status === "info" &&
                          currentStatus?.message === "Uploading recording..."
                            ? "text-gray-500"
                            : "text-green-600"
                        }`}
                        data-path={(() => {
                          try {
                            const metadataStr = localStorage.getItem(
                              "emscribe_audioFileMetadata"
                            );
                            if (metadataStr) {
                              const metadata = JSON.parse(metadataStr);
                              return metadata.path || "";
                            }
                          } catch (e) {}
                          return "";
                        })()}
                      >
                        {recordingFile.name} (
                        {(recordingFile.size / (1024 * 1024)).toFixed(1)}MB)
                        {recordingDuration > 0 &&
                          ` - ${formatDuration(recordingDuration)}`}
                      </p>

                      {/* Audio Player Controls - Hidden during upload */}
                      {!(
                        currentStatus?.status === "info" &&
                        currentStatus?.message === "Uploading recording..."
                      ) && (
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <audio
                            ref={audioPlayerRef}
                            src={audioUrl || undefined}
                            onLoadStart={handleAudioLoadStart}
                            onLoadedMetadata={handleAudioLoadedMetadata}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onEnded={handleAudioEnded}
                            onError={handleAudioError}
                            preload="metadata"
                            style={{ display: "none" }}
                          />

                          <button
                            type="button"
                            onClick={playAudio}
                            disabled={
                              audioPlaying || audioLoadingState !== "loaded"
                            }
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ▶️ Play
                          </button>

                          <button
                            type="button"
                            onClick={pauseAudio}
                            disabled={!audioPlaying}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ⏸️ Pause
                          </button>

                          <input
                            type="range"
                            min={0}
                            max={
                              isFinite(audioDuration) && audioDuration > 0
                                ? audioDuration
                                : recordingDuration || 100
                            }
                            step={0.1}
                            value={audioCurrentTime}
                            onChange={(e) =>
                              seekAudio(parseFloat(e.target.value))
                            }
                            className="w-32 md:w-48"
                            disabled={audioLoadingState !== "loaded"}
                          />

                          <span className="text-xs text-gray-700 font-mono min-w-[80px] text-right">
                            {formatDuration(audioCurrentTime)} /{" "}
                            {formatDuration(
                              isFinite(audioDuration)
                                ? audioDuration
                                : recordingDuration || 0
                            )}
                          </span>

                          {/* Status indicator */}
                          <span className="text-xs">
                            {audioLoadingState === "loading" && (
                              <span className="text-orange-600">
                                🔄 Loading...
                              </span>
                            )}
                            {audioLoadingState === "loaded" && (
                              <span className="text-green-600">✅ Ready</span>
                            )}
                            {audioLoadingState === "error" && (
                              <span className="text-red-600">❌ Error</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={generateSoapNote}
                      disabled={
                        isProcessing ||
                        (currentStatus?.status === "info" &&
                          currentStatus?.message === "Uploading recording...")
                      }
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Generate SOAP Note"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Review */}
        <div
          className={`border border-gray-200 rounded-lg ${
            !soapNoteRequested
              ? "opacity-60 pointer-events-none select-none"
              : ""
          }`}
        >
          <button
            className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
            onClick={() =>
              setActiveSection(activeSection === "review" ? "review" : "review")
            }
            disabled={!soapNoteRequested}
          >
            <span className="text-lg font-semibold">
              2. Review Transcript and Generated Note
            </span>
            <span className="text-xl">
              {activeSection === "review" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "review" && (
            <div className="p-6 border-t border-gray-200">
              Patient Encounter Name
              {/* <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Encounter Name
                </label>
                <input
                  type="text"
                  value={patientEncounterName}
                  onChange={(e) => setPatientEncounterName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white"
                  placeholder="Enter patient encounter name"
                  disabled={isSaving}
                />
              </div> */}

              {/* Status Messages */}
              {currentStatus && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    currentStatus.status === "error"
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : "bg-blue-50 border border-blue-200 text-blue-800"
                  }`}
                >
                  <div className="font-medium capitalize">
                    {currentStatus.status}
                  </div>
                  <div className="text-sm">{currentStatus.message}</div>
                </div>
              )}

              {/* Transcript (Rich Text) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transcript
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-100 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "20rem" }}
                  placeholder="Transcript will appear here..."
                />
              </div>

              {/* SOAP Note (S/O/A/P) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjective
                </label>
                <textarea
                  value={soapSubjective}
                  onChange={(e) => setSoapSubjective(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-80 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "8rem" }}
                  placeholder="Subjective notes will appear here..."
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objective
                </label>
                <textarea
                  value={soapObjective}
                  onChange={(e) => setSoapObjective(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-80 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "8rem" }}
                  placeholder="Objective notes will appear here..."
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment
                </label>
                <textarea
                  value={soapAssessment}
                  onChange={(e) => setSoapAssessment(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-50 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "8rem" }}
                  placeholder="Assessment notes will appear here..."
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan
                </label>
                <textarea
                  value={soapPlan}
                  onChange={(e) => setSoapPlan(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-50 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "8rem" }}
                  placeholder="Plan notes will appear here..."
                />
              </div>

              {/* Billing Suggestion (Rich Text) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Suggestion
                </label>
                <textarea
                  value={billingSuggestion}
                  onChange={(e) => setBillingSuggestion(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full h-80 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white resize-none"
                  style={{ minHeight: "20rem" }}
                  placeholder="Billing suggestion will appear here..."
                />
              </div>

              {/* Save Button (always enabled, but checks required fields before saving) */}
              <div className="flex flex-col items-end">
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={isSaving}
                  className={`bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Preview
                </button>
                {errorMessage && (
                  <div className="mt-3 text-red-600 text-sm text-right w-full">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <PatientEncounterPreviewOverlay
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        transcript={transcript}
        setTranscript={setTranscript}
        soapSubjective={soapSubjective}
        setSoapSubjective={setSoapSubjective}
        soapObjective={soapObjective}
        setSoapObjective={setSoapObjective}
        soapAssessment={soapAssessment}
        setSoapAssessment={setSoapAssessment}
        soapPlan={soapPlan}
        setSoapPlan={setSoapPlan}
        billingSuggestion={billingSuggestion}
        setBillingSuggestion={setBillingSuggestion}
        patientEncounterName={patientEncounterName}
        setPatientEncounterName={setPatientEncounterName}
        onSave={saveTranscriptAndNote}
        isSaving={isSaving}
        errorMessage={errorMessage}
        // Optionally pass previewSection and reviewedSections if you want to control them from parent
      />
    </>
  );
}
