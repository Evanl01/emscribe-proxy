"use client";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import * as api from "@/public/scripts/api.js";
import * as ui from "@/public/scripts/ui.js";
import * as format from "@/public/scripts/format.js";
import * as validation from "@/public/scripts/validation.js";
import * as background from "@/public/scripts/background.js";
import { createClient } from "@supabase/supabase-js";
import PatientEncounterPreviewOverlay from "@/src/components/PatientEncounterPreviewOverlay";
import { record, set } from "zod";
import ExportDataAsFileMenu from "@/src/components/ExportDataAsFileMenu.jsx";
import Auth from "@/src/components/Auth.jsx";
let supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewPatientEncounter() {
  const router = useRouter();

  // State management
  const [activeSection, setActiveSection] = useState("upload");
  const [recordingFile, setRecordingFile] = useState(null);
  const [recordingFileMetadata, setRecordingFileMetadata] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const isUploading = currentStatus?.status === "uploading-recording";

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

  useEffect(() => {
    if (!isUploading) {
      getLocalStorageRecordingFile().then(setRecordingFileMetadata);
    }
  }, [currentStatus]);

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
    recordingFileMetadata: "emscribe_recordingFileMetadata", // <-- renamed from audioFileMetadata
    recordingFile: "emscribe_recordingFile", // (optional, if you use this elsewhere)
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
  const recordingDurationRef = useRef(0);
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

  const getLocalStorageRecordingFile = async () => {
    const metadataStr = localStorage.getItem(LS_KEYS.recordingFileMetadata);
    if (!metadataStr) return null;

    try {
      const metadata = JSON.parse(metadataStr);

      // Get a signed URL from Supabase
      const { data, error } = await supabase.storage
        .from("audio-files")
        .createSignedUrl(metadata.path, 60 * 60); // 1 hour expiry

      if (error || !data?.signedUrl) {
        return {
          ...metadata,
          signedUrl: null,
          name:
            metadata.path && typeof metadata.path === "string"
              ? metadata.path.split("/")[metadata.path.split("/").length - 1]
              : "recording.webm",
        };
      }
      console.log(
        "[getLocalStorageRecordingFile]: recordingFileMetadata:",
        metadata,
        "signedUrl:",
        data.signedUrl,
        "isuploading:",
        isUploading
      );
      return {
        ...metadata,
        signedUrl: data.signedUrl,
        name:
          metadata.path && typeof metadata.path === "string"
            ? metadata.path.split("/")[metadata.path.split("/").length - 1]
            : "recording.webm",
        // size and duration are now included from stored metadata
      };
    } catch (e) {
      console.error("Error parsing recording file metadata:", e);
      return null;
    }
  };
  // useEffect(() => {
  //   background.debugElements({
  //     currentStatus,
  //     isProcessing,
  //     isUploading,
  //     soapNoteRequested,
  //     recordingFileMetadata,
  //     isRecording,
  //     transcript,
  //     soapSubjective,
  //     soapObjective,
  //     soapAssessment,
  //     soapPlan,
  //     billingSuggestion,
  //     patientEncounterName,
  //     audioDuration,
  //     audioCurrentTime,
  //     audioLoadingState,
  //     isSaving,
  //     saveAttempted,
  //     errorMessage,
  //   });
  // }, [
  //   currentStatus,
  //   isProcessing,
  //   isUploading,
  //   soapNoteRequested,
  //   recordingFileMetadata,
  //   isRecording,
  //   transcript,
  //   soapSubjective,
  //   soapObjective,
  //   soapAssessment,
  //   soapPlan,
  //   billingSuggestion,
  //   patientEncounterName,
  //   audioDuration,
  //   audioCurrentTime,
  //   audioLoadingState,
  //   isSaving,
  //   saveAttempted,
  //   errorMessage,
  // ]);

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
    if (file.size > 50 * 1024 * 1024) {
      // 50MB
      return "File size must be less than 50MB";
    }
    return null;
  };

  // Get audio duration
  const getAudioDuration = async (file) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("error", onError);
        if (audio.src) URL.revokeObjectURL(audio.src);
      };

      console.log("Getting audio duration for file:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const fallbackDuration = () => {
        // Try ref first to avoid stale state
        const duration = recordingDurationRef.current;
        setRecordingDuration(duration);
        if (duration > 0) {
          console.warn(`Using recordingDurationRef: ${duration} seconds`);
          return duration;
        }
        // As last resort, estimate based on size (~1 KB ≈ 1 sec for WebM)
        const estimated = Math.max(1, file.size / 1024);
        console.warn(`Using estimated duration: ${estimated} seconds`);
        return estimated;
      };

      const onLoadedMetadata = () => {
        cleanup();
        if (isFinite(audio.duration) && audio.duration > 0) {
          console.log("Audio duration obtained:", audio.duration);
          resolve(audio.duration);
        } else {
          resolve(fallbackDuration());
        }
      };

      const onError = () => {
        cleanup();
        resolve(fallbackDuration());
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("error", onError);
      audio.src = URL.createObjectURL(file);

      // Timeout after 10s
      setTimeout(() => {
        cleanup();
        resolve(fallbackDuration());
      }, 10000);
    });
  };

  // Helper: call server refresh endpoint and return accessToken (or null)
  const refreshAndGetAccessToken = async () => {
    try {
      const resp = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) {
        return null;
      }
      console.log("refreshAndGetAccessToken response:", resp);
      const body = await resp.json();
      return body?.accessToken || null;
    } catch (e) {
      console.error("refreshAndGetAccessToken error:", e);
      return null;
    }
  };

  // Helper: attempt upload with the current client first; on failure, refresh and retry once using a temporary client
  const uploadWithTempClient = async (filePath, file) => {
    // small helper to detect auth-like errors from Supabase client result.error
    console.log("[uploadWithTempClient]: Before calling supabase.storage.upload. JWT:", api.getJWT());
    const isAuthErrorFromSupabase = (err) => {
      if (!err) return false;
      // Supabase error objects can use different field names for HTTP status
      const statusRaw = err.statusCode ?? err.status ?? err.status_code ?? err?.status;
      const status = statusRaw ? Number(statusRaw) : null;
      const message = (err?.message || err?.error || err?.msg || "")
        .toString()
        .toLowerCase();
      console.log("Supabase error details:", { status, message, raw: err });

      // Common auth-related HTTP statuses
      if (status === 403) return true;

      // Match common auth-related keywords in the message
      if (/unauthoriz|authoriz|jwt|jws|token|session|access token/i.test(message)) return true;

      return false;
    };

    // 1) Try with currently-initialized client (may be using anon key or already-authenticated client)
    try {
      console.log("Attempting upload with current Supabase client:", supabase);
      const firstAttempt = await supabase.storage
        .from("audio-files")
        .upload(filePath, file, { upsert: false });

      console.log("First attempt:", firstAttempt, "\nData:",firstAttempt.data);
      // success
      if (!firstAttempt.error && firstAttempt.data && firstAttempt.data.path) {
        return { data: firstAttempt.data, error: null };
      }

      // If there's an error and it's NOT an auth error, throw it so caller handles it
      if (firstAttempt.error && !isAuthErrorFromSupabase(firstAttempt.error)) {
        // Throw the Supabase error object for caller
        throw firstAttempt.error;
      }

      // Otherwise it's an auth-like error; fallthrough to refresh + retry
      console.warn(
        "Initial upload attempt failed and appears auth-related:",
        firstAttempt.error
      );
    } catch (e) {
      // If the thrown/caught exception is not an auth-like Supabase error, rethrow it
      // (e may be a thrown Supabase error object or a thrown JS exception)
      const maybeErrObj = e || {};
      // If it's clearly an auth error, continue to refresh path; otherwise rethrow
      if (!isAuthErrorFromSupabase(maybeErrObj)) {
        console.warn("Initial upload threw non-auth error, rethrowing:", e);
        throw e;
      }
      console.warn(
        "Initial upload threw auth-like error, will attempt refresh and retry:",
        e
      );
    }

    // 2) Only for auth-like errors: Try refreshing access token and retry once with a temporary client
    console.log("Attempting to refresh access token...");
    const accessToken = await refreshAndGetAccessToken();
    console.log("Access token after refresh:", accessToken);
    if (!accessToken) {
      // Caller should handle redirect to login
      return {
        data: null,
        error: new Error("Session expired or refresh failed"),
        requiresLogin: true,
      };
    }

    try {
      // Create a temporary supabase client for this upload only (do not mutate module-level client)
      const tempSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        }
      );

      const secondAttempt = await tempSupabase.storage
        .from("audio-files")
        .upload(filePath, file, { upsert: false });
      console.log("Second attempt:", secondAttempt, "\nData:", secondAttempt.data);
      if (secondAttempt.error) {
        throw secondAttempt.error;
      }
      if (
        !secondAttempt.error &&
        secondAttempt.data &&
        secondAttempt.data.path
      ) {
        return { data: secondAttempt.data, error: null };
      }

      // If retry failed, throw the error so caller can handle it

      // Unexpected fallback
      throw new Error(
        "Upload failed on retry (unhandled error): " +
          JSON.stringify(secondAttempt)
      );
    } catch (e) {
      console.error("Retry upload threw or failed:", e);
      throw e;
    }
  };

  // Handle file upload
  const handleRecordingFileUpload = async (file) => {
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
      console.log("File metadata:", {
        name: file.name,
        size: file.size,
        type: file.type,
        duration,
      });
      // Show uploading status
      setCurrentStatus({
        status: "uploading-recording",
        message: "Uploading recording...",
      });
      setIsSaving(true);

      // Check current auth state with Supabase and log masked info for debugging
      const userResp = await supabase.auth.getUser();
      const sessionResp = await supabase.auth.getSession();
      const user = userResp?.data?.user || null;

      const maskEmailForLog = (email) => {
        try {
          if (!email || typeof email !== "string") return null;
          const parts = email.split("@");
          if (parts.length !== 2) return "***";
          const local = parts[0];
          const domain = parts[1];
          const maskedLocal = local.length <= 2 ? local.replace(/./g, "*") : local[0] + local.slice(1, 2).replace(/./g, "*") + local.slice(-1);
          return `${maskedLocal}@${domain}`;
        } catch (e) {
          return "***";
        }
      };

      // Log summary (avoid printing full tokens/emails) to help debug multi-tab/session issues
      try {
        const jwt = typeof api !== "undefined" && api.getJWT ? api.getJWT() : null;
        console.log("[handleRecordingFileUpload] supabase.getUser result:", {
          hasUser: !!user,
          maskedEmail: user ? maskEmailForLog(user.email) : null,
          sessionExists: !!sessionResp?.data?.session,
          jwtPresent: !!jwt,
        });
      } catch (e) {
        console.log("[handleRecordingFileUpload] supabase.getUser logging failed", e);
      }
      // If no user is available in the client, stop and prompt for login
      if (!user) {
        setIsSaving(false);
        setCurrentStatus({ status: "error", message: "Not logged in" });
        alert("You must be logged in to upload recordings.");
        if (typeof api !== "undefined" && api.deleteJWT) api.deleteJWT();
        router.push("/login");
        return;
      }

      console.log("Current user:", { id: user.id, maskedEmail: maskEmailForLog(user.email) });
      const userEmail = user.email;

      // Get extension from uploaded file name
      const originalName = file.name || "audio";
      const lastDot = originalName.lastIndexOf(".");
      const extension =
        lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : "";
      const fileName = `${userEmail}-${Date.now()}-${Math.floor(
        Math.random() * 100
      )
        .toString()
        .padStart(2, "0")}${extension ? `.${extension}` : ""}`;
      console.log("[handleRecordingFileUpload] constructed filename/path:", {
        fileName,
        filePath: `${user?.id || "anonymous"}/${fileName}`,
      });
      const filePath = `${user?.id || "anonymous"}/${fileName}`;

      // Attempt upload: try current client first, then refresh+retry once if necessary
      const uploadResult = await uploadWithTempClient(filePath, file);

      setIsSaving(false);

      if (uploadResult?.requiresLogin) {
        alert("Session expired. Please log in again.");
        api.deleteJWT();
        router.push("/login");
        return;
      }

      const { data, error } = uploadResult;

      if (error || !data || !data?.path) {
        setCurrentStatus({
          status: "error",
          message: error?.message || "Upload failed",
        });
        alert(
          "Error uploading to Supabase: " + (error?.message || String(error))
        );
        return;
      }

      // Clear old recording file from localStorage and reset local variables
      localStorage.removeItem(LS_KEYS.recordingFile);
      localStorage.removeItem(LS_KEYS.recordingFileMetadata);
      setRecordingFile(null);
      setRecordingDuration(0);
      setRecordingFileMetadata(null);

      // Save enhanced metadata for later use
      const metadata = {
        path: data.path,
        id: data.id,
        fullPath: data.fullPath,
        size: file.size, // <-- add file size
        duration, // <-- add duration from getAudioDuration
      };

      console.log("File uploaded successfully:", metadata);

      // Store with new key name
      localStorage.setItem(
        LS_KEYS.recordingFileMetadata,
        JSON.stringify(metadata)
      );
      // console.log("LS recording file metadata saved:", { ...localStorage });

      // Update local state
      setRecordingFile(file);
      setRecordingDuration(duration);
      setRecordingFileMetadata(metadata);

      setCurrentStatus({ status: "success", message: "Recording Ready" });
    } catch (error) {
      setIsSaving(false);
      setCurrentStatus({ status: "error", message: error.message });
      setIsProcessing(false);
      console.error("Error processing or uploading audio file:", error);
      alert(
        "Error processing or uploading audio file. Please ensure it's a valid audio file."
      );
    }
  };

  // File input handler
  const handleRecordingFileInputChange = (event) => {
    const file = event.target.files && event.target.files[0];
    handleRecordingFileUpload(file);
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
  // Fixed startRecording function with proper interval management
  const startRecording = async () => {
    // Clear any existing interval first
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Clear previous recording file and remove from localStorage
    localStorage.removeItem(LS_KEYS.recordingFile);
    localStorage.removeItem(LS_KEYS.recordingFileMetadata);
    setRecordingFile(null);
    setRecordingFileMetadata(null);
    // Reset recording duration to 0 when starting new recording
    setRecordingDuration(0);
    recordingDurationRef.current = 0;

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
        // Clear the interval when recording stops
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const recordingFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });

        // Set the recording file locally first (for immediate playback)
        setRecordingFile(recordingFile);
        console.log("Recording file set locally:", recordingFile);
        // console.log("Recording duration:", recordingDuration);
        // Upload the file to Supabase - pass true to indicate this is a recorded file
        await handleRecordingFileUpload(recordingFile, true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start duration counter - use functional update to avoid stale closure
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prevDuration) => {
          const newDuration = prevDuration + 1;
          console.log(`Recording duration: ${newDuration} seconds`); // Debug log
          if (newDuration >= 40 * 60) {
            // 40 minutes max
            stopRecording();
          }
          recordingDurationRef.current = newDuration;
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please check permissions.");
    }
  };

  // Fixed stopRecording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clear the interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Add cleanup effect to prevent memory leaks
  useEffect(() => {
    // Cleanup function to clear interval on unmount
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, []);

  // Generate SOAP note
  // Update the generateSoapNote function to handle recorded audio upload
  const generateSoapNote = async () => {
    // Clear localStorage and reset textareas
    // Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));
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

    let timeoutId;
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    try {
      timeoutId = setTimeout(() => {
        setIsProcessing(false);
        setCurrentStatus({
          status: "error",
          message: "Request timed out after 3 minutes. Please try again.",
        });
        alert("Request timed out after 3 minutes. Please try again.");
      }, TIMEOUT_MS);
      try {
        let recording_file_path = "";

        // Check if we have existing uploaded file metadata with new key name
        const metadataStr = localStorage.getItem(LS_KEYS.recordingFileMetadata);
        // console.log("Using recording file metadata:", metadataStr);
        // console.log("All LS data: ", { ...localStorage });
        if (metadataStr) {
          // File was uploaded - use existing metadata
          const metadata = JSON.parse(metadataStr);
          if (!metadata.path) {
            throw new Error("Audio file path missing in metadata.");
          }
          recording_file_path = metadata.path;
        } else {
          throw new Error(
            "No audio file found. Please upload or record audio first."
          );
        }

        // Now proceed with the API call using recording_file_path
        const payload = { recording_file_path: recording_file_path };
        const response = await api.fetchWithRefresh("/api/prompt-llm", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api.getJWT()}`,
          },
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          setIsProcessing(false);

          let errorMessage = `Server error: ${response.status} ${response.statusText}`;
          // setCurrentStatus({
          //   status: "error",
          //   message: errorMessage,
          // });
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
                  if (jsonData.status === "error") {
                    setCurrentStatus(jsonData);
                    setIsProcessing(false);
                    throw new Error(
                      jsonData.message || "Streamed error received"
                    );
                  }
                  if (
                    jsonData.status === "transcription complete" &&
                    jsonData.data?.transcript
                  ) {
                    setTranscript(jsonData.data.transcript);
                  }
                  if (
                    jsonData.status === "soap note complete" &&
                    jsonData.data
                  ) {
                    let noteObj = {};
                    let billingObj = {};
                    try {
                      // Parse the JSON string (no code block markers)
                      const parsed =
                        typeof jsonData.data === "string"
                          ? JSON.parse(jsonData.data)
                          : jsonData.data;
                      console.log(
                        "[generateSoapNote]: Parsed SOAP note data:",
                        parsed
                      );

                      noteObj = parsed.soap_note || {};
                      billingObj = parsed.billing || {};

                      // Set textareas directly
                      let soapSubjectiveText =
                        typeof noteObj.subjective === "string"
                          ? noteObj.subjective
                          : format.printJsonObject(noteObj.subjective);
                      let soapObjectiveText =
                        typeof noteObj.objective === "string"
                          ? noteObj.objective
                          : format.printJsonObject(noteObj.objective);
                      let soapAssessmentText =
                        typeof noteObj.assessment === "string"
                          ? noteObj.assessment
                          : format.printJsonObject(noteObj.assessment);
                      let soapPlanText =
                        typeof noteObj.plan === "string"
                          ? noteObj.plan
                          : format.printJsonObject(noteObj.plan);
                      setSoapSubjective(soapSubjectiveText);
                      setSoapObjective(soapObjectiveText);
                      setSoapAssessment(soapAssessmentText);
                      setSoapPlan(soapPlanText);

                      // Format billing suggestion for textarea (as readable text)
                      // let billingText = "";
                      // if (billingObj.icd10_codes) {
                      //   billingText += `ICD10 Codes: ${billingObj.icd10_codes.join(
                      //     ", "
                      //   )}\n`;
                      // }
                      // if (billingObj.billing_code) {
                      //   billingText += `CPT/Billing Code: ${billingObj.billing_code}\n`;
                      // }
                      // if (billingObj.additional_inquiries) {
                      //   billingText += `Additional Inquiries: ${billingObj.additional_inquiries}\n`;
                      // }
                      let billingText =
                        typeof billingObj === "string"
                          ? billingObj
                          : format.printJsonObject(billingObj);
                      setBillingSuggestion(billingText.trim());

                      setIsProcessing(false);
                      // Set localStorage with new keys
                      localStorage.setItem(
                        LS_KEYS.patientEncounterName,
                        patientEncounterName
                      );
                      localStorage.setItem(LS_KEYS.transcript, transcript);
                      localStorage.setItem(
                        LS_KEYS.soapSubjective,
                        soapSubjectiveText
                      );
                      localStorage.setItem(
                        LS_KEYS.soapObjective,
                        soapObjectiveText
                      );
                      localStorage.setItem(
                        LS_KEYS.soapAssessment,
                        soapAssessmentText
                      );
                      localStorage.setItem(LS_KEYS.soapPlan, soapPlanText);
                      localStorage.setItem(
                        LS_KEYS.billingSuggestion,
                        billingText.trim()
                      );
                    } catch (e) {
                      console.error(
                        "Failed to parse SOAP note JSON:",
                        e,
                        jsonData.data
                      );
                      setSoapSubjective("");
                      setSoapObjective("");
                      setSoapAssessment("");
                      setSoapPlan("");
                      setBillingSuggestion("");
                    }
                  }
                }
              } catch (e) {
                throw new Error(
                  `Failed to parse JSON line: ${line}\nError: ${e.message}`
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("[generateSoapNote]: Error", error);
        const errorMsg =
          typeof error === "string" ? error : error?.message || "";

        if (errorMsg.includes("expired token") || errorMsg.includes("401")) {
          router.push("/login");
          return;
        }
        alert(`Error generating SOAP note: ${errorMsg}`);
        setCurrentStatus({
          status: "error",
          message: `Failed to process recording: ${errorMsg}`,
        });
        setIsProcessing(false);
      }
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("[generateSoapNote]: Error", error);
      alert(`Error generating SOAP note: ${error.message}`);
      setCurrentStatus({
        status: "error",
        message: `Failed to process recording: ${error.message}`,
      });
      setIsProcessing(false);
    }
  };

  // Save transcript and note
  const savePatientEncounter = async () => {
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
      // const icdMatch = billingSuggestion.match(
      //   /icd10[:\s]*([\s\S]*?)(cpt[:\s]|additional_inquiries[:\s]|$)/i
      // );
      // const cptMatch = billingSuggestion.match(
      //   /cpt[:\s]*([\s\S]*?)(icd10[:\s]|additional_inquiries[:\s]|$)/i
      // );
      // const addMatch = billingSuggestion.match(
      //   /additional_inquiries[:\s]*([\s\S]*?)(icd10[:\s]|cpt[:\s]|$)/i
      // );
      // billingSuggestionObject.icd10 = icdMatch
      //   ? icdMatch[1].trim().replace(/\r?\n/g, "\n")
      //   : "";
      // billingSuggestionObject.cpt = cptMatch
      //   ? cptMatch[1].trim().replace(/\r?\n/g, "\n")
      //   : "";
      // billingSuggestionObject.additional_inquiries = addMatch
      //   ? addMatch[1].trim().replace(/\r?\n/g, "\n")
      //   : "";

      // Use new complete endpoint for mass save

      // Get recording_file_path from localStorage metadata
      const recordingFileMetadata = localStorage.getItem(
        LS_KEYS.recordingFileMetadata
      );
      let recording_file_path = "";

      if (recordingFileMetadata) {
        try {
          const metadataObj = JSON.parse(recordingFileMetadata);
          recording_file_path = metadataObj.path || "";
        } catch (e) {
          console.error("Error parsing recording metadata:", e);
          recording_file_path = "";
        }
      }

      //merge SOAP note and billing suggestion into soapNote_text jsonObject

      const payload = {
        patientEncounter: { name: patientEncounterName },
        recording: { recording_file_path },
        transcript: { transcript_text: transcript },
        soapNote_text: {
          soapNote: soapNoteObject,
          billingSuggestion,
        }, // <-- pass as object
      };

      console.log("Saving patient encounter with data:", payload);
      const response = await api.fetchWithRefresh(
        "/api/patient-encounters/complete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${api.getJWT()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store", // Always fetch fresh data, never use cache
        }
      );
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
      setRecordingFile(null);
      setRecordingFileMetadata(null);
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
      <div className="max-w-8xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">New Patient Encounter</h1>

        {/* Section 1: Upload/Record */}
        <div className="border border-gray-200 rounded-lg mb-4">
          <button
            className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
            onClick={() =>
              setActiveSection(activeSection === "upload" ? "upload" : "upload")
            }
          >
            <span className="text-lg font-semibold">
              1. Upload or Record Patient Encounter Audio
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
                  <h3 className="text-lg font-medium">Upload Audio</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="audio/*,video/mp4,.mp4,.m4a" // Updated to include MP4 and M4A
                      onChange={handleRecordingFileInputChange}
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
                        Max 50MB, 30 minutes duration
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

              {(() => {
                if (recordingFileMetadata || isUploading) {
                  return (
                    <div
                      className={`mt-6 p-4 rounded-lg border ${
                        isUploading
                          ? "bg-gray-100 border-gray-300 opacity-60 pointer-events-none select-none"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isUploading ? "text-gray-500" : "text-green-800"
                            }`}
                          >
                            {isUploading
                              ? "Uploading recording..."
                              : "Recording Ready"}
                          </p>
                          <p
                            className={`text-sm ${
                              isUploading ? "text-gray-500" : "text-green-600"
                            }`}
                            data-path={recordingFileMetadata?.path || ""}
                          >
                            {(recordingFileMetadata?.name || "recording.webm") +
                              " (" +
                              (
                                (recordingFileMetadata?.size || 0) /
                                (1024 * 1024)
                              ).toFixed(1) +
                              "MB)"}
                          </p>

                          {/* Audio Player Controls - Hidden during upload */}
                          {!isUploading && recordingFileMetadata?.signedUrl && (
                            <div className="mt-4 flex items-center gap-2 flex-wrap">
                              <audio
                                ref={audioPlayerRef}
                                src={recordingFileMetadata.signedUrl}
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
                                    : recordingFileMetadata.duration || 100
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
                                    : recordingFileMetadata.duration || 0
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
                                  <span className="text-green-600">
                                    ✅ Ready
                                  </span>
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
                          disabled={isProcessing || isUploading}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Generate SOAP Note"}
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
              2. Edit Generated Transcript and SOAP Note
            </span>
            <span className="text-xl">
              {activeSection === "review" ? "−" : "+"}
            </span>
          </button>

          {activeSection === "review" && (
            <div className="p-6 border-t border-gray-200">
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

              {/* Patient Encounter Name */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
                  Patient Encounter Name
                </label>
                <input
                  type="text"
                  value={patientEncounterName}
                  onChange={(e) => setPatientEncounterName(e.target.value)}
                  disabled={isSaving || isProcessing}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white"
                  placeholder="Patient Encounter Name..."
                  maxLength={100}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <label className="block text-sm font-bold text-xl text-gray-700 mb-2">
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
                <div className="flex gap-4">
                  {/* Export menu/button - placed to the left of Preview button */}
                  <ExportDataAsFileMenu
                    patientEncounterData={{ name: patientEncounterName }}
                    transcriptData={{ transcript_text: transcript }}
                    soapNotesData={[
                      {
                        soapNote_text: {
                          soapNote: {
                            subjective: soapSubjective,
                            objective: soapObjective,
                            assessment: soapAssessment,
                            plan: soapPlan,
                          },
                        },
                      },
                    ]}
                    billingSuggestionData={billingSuggestion}
                  />
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={isSaving}
                    className={`bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium ${
                      isSaving ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Preview & Save
                  </button>
                </div>
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
        onSave={savePatientEncounter}
        isSaving={isSaving}
        errorMessage={errorMessage}
        sections={["transcript", "soapNote", "billingSuggestion"]}
        // Optionally pass previewSection and reviewedSections if you want to control them from parent
      />
    </>
  );
}
