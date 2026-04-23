"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./LoginForm.module.css";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { setAuthUser, useAuth } from "@/context/AuthContext";
import { User } from "@/lib/types";
import { FormSkeleton } from "@/components/SkeletonLoader";
import {
  Visibility,
  VisibilityOff,
  MailOutline,
  LockOutlined,
  WarningAmber,
} from "@mui/icons-material";
import LogoImage from "../../public/circle9logo.png"

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user, isLoading, setUser } = useAuth();
  const supabase = createClient();

  /* Redirect if already authenticated */
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single() as { data: any; error: any };

      if (fetchError || !data) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      if (data.password !== password) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      const loggedInUser: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        created_at: data.created_at,
        assigned_number: data.assigned_number || null,
      };

      setUser(loggedInUser);
      setAuthUser(loggedInUser);
      router.replace("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        {/* Brand mark */}
        <div className={styles.brandMark}>
          <div className={styles.logoRing}>
            {/* <LockOutlined className={styles.logoIcon} /> */}
            <Image src={LogoImage} alt="Logo" className={styles.logoIcon} />
          </div>
        </div>

        {/* Heading */}
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Admin Portal</p>

        {/* Decorative divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <div className={styles.dividerDot} />
          <div className={styles.dividerLine} />
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorAlert}>
            <WarningAmber className={styles.errorIcon} />
            {error}
          </div>
        )}

        {/* Form or Skeleton */}
        {loading ? (
          <div style={{ marginTop: "1.5rem" }}>
            <FormSkeleton />
          </div>
        ) : (
          <form onSubmit={handleLogin} className={styles.form} noValidate>

            {/* Email field */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                <MailOutline className={styles.labelIcon} />
                Email address
              </label>
              <div className={styles.inputWrapper}>
                <MailOutline className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                <LockOutlined className={styles.labelIcon} />
                Password
              </label>
              <div className={styles.inputWrapper}>
                <LockOutlined className={styles.inputIcon} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              <span className={styles.btnContent}>
                Sign In
              </span>
            </button>

          </form>
        )}

        {/* Footer */}
        <p className={styles.footer}>
          Secure access
          <span className={styles.footerDot}>·</span>
          Encrypted connection
          <span className={styles.footerDot}>·</span>
          Admin only
        </p>

      </div>
    </div>
  );
}