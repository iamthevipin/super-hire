import Link from "next/link";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-8 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#117a72] no-underline"
        >
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 0L0 11h7l-2 9L16 9H9l2-9z"
              fill="#117a72"
            />
          </svg>
          <span
            className="text-xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            Super Hire
          </span>
        </Link>
      </div>

      {/* Split body */}
      <div className="flex flex-1 items-center">
        {/* Left — tagline */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24">
          <h1 className="text-5xl xl:text-6xl font-extrabold text-[#141d1c] leading-[1.1] tracking-tight max-w-lg">
            The fastest way to go from talents to offer
          </h1>
          <p className="mt-6 text-lg text-[#3e4947] max-w-sm">
            A simple pipeline for fast-moving teams.
          </p>
        </div>

        {/* Right — form card */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
