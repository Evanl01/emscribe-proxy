"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign-in", email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      // Save JWT to localStorage for website access (best practice: only store JWT, not userEmail)
      window.localStorage.setItem("jwt", data.token);
      // Notify extension content script (if present) via window.postMessage
      window.postMessage({
        type: "EMSCRIBE_LOGIN",
        jwt: data.token,
        userEmail: email
      }, "*");
      router.push("/new-recording");
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
        <h2>Login to EmScribe</h2>
        <div className="error" id="error">{error}</div>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            id="email"
            placeholder="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            id="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
          <button id="loginBtn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
