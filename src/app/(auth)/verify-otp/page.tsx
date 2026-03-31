"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { verifyOtp, signUpWithEmail } from "@/actions/auth";

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpPageContent />
    </Suspense>
  );
}

function VerifyOtpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const flow = (searchParams.get("flow") ?? "signup") as "signup" | "login";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");

  useEffect(() => {
    if (!email) router.replace("/signup");
  }, [email, router]);

  async function handleVerify() {
    if (otp.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("otp", otp);
    formData.set("flow", flow);

    const result = await verifyOtp(formData);
    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    if ("redirect" in result) {
      router.push(result.redirect);
    }
  }

  async function handleResend() {
    if (!email || resendStatus === "sending") return;

    setResendStatus("sending");
    setError(null);

    const formData = new FormData();
    formData.set("email", email);

    const result = await signUpWithEmail(formData);

    if ("error" in result) {
      setError(result.error);
      setResendStatus("idle");
      return;
    }

    setOtp("");
    setResendStatus("sent");
    setTimeout(() => setResendStatus("idle"), 4000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#117a72] mb-10 no-underline"
      >
        <svg width="14" height="18" viewBox="0 0 16 20" fill="none" aria-hidden="true">
          <path d="M9 0L0 11h7l-2 9L16 9H9l2-9z" fill="#117a72" />
        </svg>
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-manrope)" }}
        >
          Super Hire
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-[#141d1c] mb-2">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          We sent a 6-digit code to{" "}
          {email && (
            <span className="font-medium text-[#141d1c]">{email}</span>
          )}
        </p>

        <OtpInput value={otp} onChange={setOtp} disabled={submitting} />

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={submitting || otp.length < 6}
          className="w-full h-11 mt-6 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm"
        >
          {submitting ? "Verifying…" : "Verify & Continue"}
        </Button>

        <p className="mt-5 text-sm text-muted-foreground">
          Didn&apos;t receive a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendStatus !== "idle"}
            className="font-semibold text-[#117a72] hover:underline disabled:opacity-50"
          >
            {resendStatus === "sending"
              ? "Sending…"
              : resendStatus === "sent"
              ? "Code sent!"
              : "Resend OTP"}
          </button>
        </p>
      </div>

      <Link
        href={flow === "login" ? "/login" : "/signup"}
        className="mt-6 text-sm text-muted-foreground hover:text-[#141d1c] inline-flex items-center gap-1.5"
      >
        <span aria-hidden="true">←</span>{" "}
        {flow === "login" ? "Back to Login" : "Back to Sign Up"}
      </Link>
    </div>
  );
}
