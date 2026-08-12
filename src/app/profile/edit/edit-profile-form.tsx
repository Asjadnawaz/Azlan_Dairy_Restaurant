"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function EditProfileForm({ initialUser }: { initialUser: User }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Parse existing full_name if first_name/last_name aren't explicitly set
  const initialFullName = initialUser.user_metadata?.full_name || "";
  const nameParts = initialFullName.split(" ");
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(initialUser.user_metadata?.first_name || initialFirstName);
  const [lastName, setLastName] = useState(initialUser.user_metadata?.last_name || initialLastName);
  const [email, setEmail] = useState(initialUser.email || "");
  const [phone, setPhone] = useState(initialUser.user_metadata?.phone || "03");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim().length < 2) {
      toast.error("First name must be at least 2 characters.");
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
      toast.error("Contact number must be exactly 11 digits long and start with 03.");
      return;
    }

    setSaving(true);
    const supabase = createBrowserClient();

    try {
      // 1. Update User Metadata
      const combinedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name: combinedFullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim()
        }
      });

      if (updateError) throw updateError;

      // 2. Handle email update if changed
      if (email !== initialUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          toast.error(`Email update failed: ${emailError.message}`);
        } else {
          toast.success("Profile updated. A confirmation link has been sent to your new email.");
          setSaving(false);
          router.refresh();
          return;
        }
      }

      toast.success("Profile updated successfully!");
      router.refresh(); // Refresh Server Components to show updated state
      
    } catch (error: unknown) {
      console.error("Profile update error:", error);
      toast.error(getErrorMessage(error, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-10">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)] tracking-tight">
              Edit Profile
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Update your personal information and preferences.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface-container-highest)] text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-[var(--color-surface-container-lowest)] rounded-3xl border border-[var(--color-surface-variant)] custom-shadow p-6 md:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Fields Section */}
            <div className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5">
                    First Name <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)]">person</span>
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      required
                      minLength={2}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                      placeholder="First name"
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)]">person</span>
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5">
                  Email Address <span className="text-[var(--color-error)]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)]">mail</span>
                  </div>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                    placeholder="Enter your email address"
                  />
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Changing your email may require verification.
                </p>
              </div>

              {/* Phone/Contact */}
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5">
                  Contact Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)]">call</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    required
                    pattern="03[0-9]{9}"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                    placeholder="e.g. 03001234567"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-[var(--color-outline-variant)]/50 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={saving}
                className="px-6 py-3 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] text-sm font-bold hover:bg-[var(--color-surface-container-highest)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow disabled:opacity-70 min-w-[140px]"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
