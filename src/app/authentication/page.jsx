"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/public/scripts/api.js";
import * as ui from "@/public/scripts/ui.js";
import * as format from "@/public/scripts/format.js";
import * as validation from "@/public/scripts/validation.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <main>
      <title>EmScribe Email Confirmation</title>
      <style>{`
        body { font-family: Arial, sans-serif; background: #f7f7f7; }
        .signup-container { max-width: 350px; margin: 80px auto; background: #fff; padding: 32px 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .signup-container h2 { margin-bottom: 18px; }
        .signup-container input { width: 100%; padding: 10px; margin: 8px 0 16px 0; border: 1px solid #ccc; border-radius: 4px; }
        .signup-container button { width: 100%; padding: 10px; background: #1976d2; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
        .signup-container button:disabled { background: #aaa; }
        .error { color: #d32f2f; margin-bottom: 10px; }
      `}</style>
      <div className="signup-container">
        <h2>Email Confirmation</h2>
        <div className="authentication-info">
          <p style={{ marginBottom: "16px" }}>Please check your email for a confirmation link from Supabase to complete the registration process.</p>
          <button onClick={() => router.push("/login")}>
            Login
          </button>
        </div>
      </div>
    </main>
  );
}
