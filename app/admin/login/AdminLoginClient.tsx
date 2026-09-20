"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { loadAdminProfile, signInAdmin } from "@/lib/admin-auth";

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    loadAdminProfile(user).then((profile) => {
      if (profile) router.replace("/admin");
    }).catch(() => {});
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      await signInAdmin(email, password);
      router.replace("/admin");
    } catch (error) {
      setMessage(error instanceof Error
        ? error.message
        : "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="adminLoginCard" onSubmit={submit}>
      <div className="adminBadge">ADMIN</div>
      <h1>لوحة إدارة Morocco Graduation</h1>
      <p>هذه المنطقة مخصصة للحساب الإداري المصرح به فقط.</p>

      {message && <p className="formError">{message}</p>}

      <label>
        البريد الإلكتروني
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        كلمة المرور
        <div className="passwordField">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </label>

      <button className="submitOrder" type="submit" disabled={loading}>
        {loading ? "جاري الدخول…" : "دخول"}
      </button>
    </form>
  );
}
