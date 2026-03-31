import Link from "next/link";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#117a72] mb-10 no-underline"
      >
        <svg
          width="14"
          height="18"
          viewBox="0 0 16 20"
          fill="none"
          aria-hidden="true"
        >
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
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#141d1c]">
            Set up your company
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tell us a bit about your team so we can personalise your workspace.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
