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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      // Use Supabase Auth for client-side authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      // Save JWT to localStorage for backend API and extension
      const jwt = data.session?.access_token;
      if (!jwt) throw new Error("No access token returned from Supabase.");
      window.localStorage.setItem("jwt", jwt);
      window.localStorage.setItem("userEmail", email);
      // Notify extension content script (if present) via window.postMessage
      window.postMessage(
        {
          type: "EMSCRIBE_LOGIN",
          jwt,
          userEmail: email,
        },
        "*"
      );
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <title>EmScribe Login</title>
      <style>{`
        body { font-family: Arial, sans-serif; background: #f7f7f7; }
        .login-container { max-width: 350px; margin: 80px auto; background: #fff; padding: 32px 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .login-container h2 { margin-bottom: 18px; }
        .login-container input { width: 100%; padding: 10px; margin: 8px 0 16px 0; border: 1px solid #ccc; border-radius: 4px; }
        .login-container button { width: 100%; padding: 10px; background: #1976d2; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
        .login-container button:disabled { background: #aaa; }
        .error { color: #d32f2f; margin-bottom: 10px; }
      `}</style>
      <div className="login-container">
        <h2>EmScribe Login</h2>
        <div className="error" id="error">
          {error}
        </div>
        <form onSubmit={handleLogin}>
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
          <a href="/signup" style={{ color: "#1976d2", fontSize: "14px", display: "block", marginBottom: "16px" }}>
            Create an account
          </a>
          <button id="loginBtn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
