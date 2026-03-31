"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEnterprise } from "@/actions/enterprise";
import {
  createEnterpriseSchema,
  EMPLOYEE_COUNT_OPTIONS,
  type CreateEnterpriseSchema,
} from "@/lib/validations/enterprise";

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateEnterpriseSchema>({
    resolver: zodResolver(createEnterpriseSchema),
  });

  async function onSubmit(data: CreateEnterpriseSchema) {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("website_url", data.website_url ?? "");
    formData.set("employee_count", data.employee_count);
    formData.set("city", data.city);
    formData.set("state", data.state);
    formData.set("country", data.country);

    const result = await createEnterprise(formData);

    if ("error" in result) {
      setServerError(result.error);
      return;
    }

    router.push(result.redirect);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Company name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className={labelClass}>
          Company Name <Required />
        </Label>
        <Input
          id="name"
          placeholder="Acme Inc."
          disabled={isSubmitting}
          {...register("name")}
          className={inputClass}
        />
        <FieldError message={errors.name?.message} />
      </div>

      {/* Website URL */}
      <div className="space-y-1.5">
        <Label htmlFor="website_url" className={labelClass}>
          Website URL{" "}
          <span className="text-muted-foreground font-normal normal-case tracking-normal">
            (optional)
          </span>
        </Label>
        <Input
          id="website_url"
          type="url"
          placeholder="https://yourcompany.com"
          disabled={isSubmitting}
          {...register("website_url")}
          className={inputClass}
        />
        <FieldError message={errors.website_url?.message} />
      </div>

      {/* Employee count */}
      <div className="space-y-1.5">
        <Label htmlFor="employee_count" className={labelClass}>
          Team Size <Required />
        </Label>
        <select
          id="employee_count"
          disabled={isSubmitting}
          {...register("employee_count")}
          className={selectClass}
          defaultValue=""
        >
          <option value="" disabled>
            Select team size
          </option>
          {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt} employees
            </option>
          ))}
        </select>
        <FieldError message={errors.employee_count?.message} />
      </div>

      {/* City + State */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city" className={labelClass}>
            City <Required />
          </Label>
          <Input
            id="city"
            placeholder="San Francisco"
            disabled={isSubmitting}
            {...register("city")}
            className={inputClass}
          />
          <FieldError message={errors.city?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="state" className={labelClass}>
            State <Required />
          </Label>
          <Input
            id="state"
            placeholder="CA"
            disabled={isSubmitting}
            {...register("state")}
            className={inputClass}
          />
          <FieldError message={errors.state?.message} />
        </div>
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <Label htmlFor="country" className={labelClass}>
          Country <Required />
        </Label>
        <Input
          id="country"
          placeholder="United States"
          disabled={isSubmitting}
          {...register("country")}
          className={inputClass}
        />
        <FieldError message={errors.country?.message} />
      </div>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm mt-2"
      >
        {isSubmitting ? "Creating…" : "Create Enterprise"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function Required() {
  return <span className="text-destructive">*</span>;
}

const labelClass =
  "text-xs font-semibold uppercase tracking-widest text-[#3e4947]";

const inputClass = "h-11 rounded-xl border-input";

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-white px-3 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#117a72] focus:border-[#117a72] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
