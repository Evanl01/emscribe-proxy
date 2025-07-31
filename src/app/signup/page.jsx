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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Required fields: Email and password.");
      return;
    }
    setLoading(true);
    try {
      // Use Supabase Auth for client-side authentication
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      console.log("Sign-up data:", data);
      if (!data.session) {
        // Check if email exists and is confirmed
        router.push("/login");
        throw new Error(
          "Account created. Check your email for confirmation link. If you don't receive it, proceed to login."
        );
      }
      console.log("Sign-up data:", await response.json());
      setLoading(false);
      router.push("/authentication");
      return;
    } catch (err) {
      alert(err.message);
      // setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <title>EmScribe Sign Up</title>
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
        <h2>EmScribe Sign Up</h2>
        <div className="error" id="error">
          {error}
        </div>
        <form onSubmit={handleSignup}>
          <input
            type="email"
            id="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            id="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button id="signupBtn" type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Signup"}
          </button>
        </form>
      </div>
    </main>
  );
}
