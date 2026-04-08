"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, signInWithGoogle } from "@/actions/auth";
import { signUpSchema, type SignUpSchema } from "@/lib/validations/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "no_account") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError(
        "No account found for this email. Please sign up to create one."
      );
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(data: SignUpSchema) {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", data.email);

    const result = await loginWithEmail(formData);

    if ("error" in result) {
      setServerError(result.error);
      return;
    }

    router.push(`/verify-otp?flow=login&email=${encodeURIComponent(data.email)}`);
  }

  async function handleGoogle() {
    setServerError(null);
    setGoogleLoading(true);

    const result = await signInWithGoogle("login");

    if ("error" in result) {
      setServerError(result.error);
      setGoogleLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  const busy = isSubmitting || googleLoading;

  return (
    <AuthSplitLayout>
      <h2 className="text-2xl font-bold text-[#141d1c] mb-6">Login</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-widest text-[#3e4947]"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            disabled={busy}
            {...register("email")}
            className="h-11 rounded-xl border-input"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm"
        >
          {isSubmitting ? "Sending code…" : "Continue with Email"}
        </Button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          or
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={handleGoogle}
        className="w-full h-11 rounded-full font-semibold text-sm border-input"
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <p className="mt-6 text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#117a72] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
