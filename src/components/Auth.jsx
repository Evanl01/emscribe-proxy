import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Directly define checkAuthAndRedirect here
async function checkAuthAndRedirect(router) {
  const jwt = typeof window !== "undefined" ? window.localStorage.getItem("jwt") : null;
  if (!jwt) {
    window.localStorage.removeItem("jwt");
    router.push("/login");
    return;
  }
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ action: "check-validity" }),
    });
    if (!response.ok) {
      window.localStorage.removeItem("jwt");
      router.push("/login");
      return;
    }
    const data = await response.json();
    if (!data.valid) {
      window.localStorage.removeItem("jwt");
      router.push("/login");
    }
  } catch (err) {
    window.localStorage.removeItem("jwt");
    router.push("/login");
  }
}

export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect(router);
  }, [router]);

  return null;
}
