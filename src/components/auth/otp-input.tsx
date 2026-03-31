"use client";

import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OTP_LENGTH = 6;

export function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  }

  function updateDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    updateDigit(index, digit);
    if (digit) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        updateDigit(index, "");
      } else {
        updateDigit(index - 1, "");
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? "");
    onChange(next.join(""));
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-12 h-14 text-center text-xl font-semibold rounded-xl border border-input bg-white",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[#117a72] focus:border-[#117a72]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            digit && "border-[#117a72]"
          )}
        />
      ))}
    </div>
  );
}
