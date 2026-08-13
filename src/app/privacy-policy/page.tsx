import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Azlan Fast Food",
  description:
    "Privacy Policy and data protection details for Azlan Fast Food and BBQ point.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 md:p-16 rounded-[2rem] shadow-sm border border-slate-200/60">
        <div className="mb-12 pb-8 border-b border-slate-100">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Privacy Policy
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-medium text-slate-500">
            <span className="bg-slate-100 px-3 py-1.5 rounded-md inline-block">
              Last updated: August 10, 2026
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md inline-block">
              Effective date: August 10, 2026
            </span>
          </div>
        </div>

        <div className="space-y-12 text-slate-600 leading-relaxed text-[15px] sm:text-base">
          <section>
            <p className="text-lg text-slate-700 font-medium mb-8">
              This Privacy Policy describes how <strong>Azlan Fast Food and BBQ point</strong> ({'"we", "us", or "our"'}) collects, uses, stores, and protects your personal information when you use our website and ordering services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">1</span>
              Information We Collect
            </h2>
            <p className="mb-4">We collect the following categories of personal information:</p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Account Information</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Email address</strong> (for account creation, login, and order confirmations)</li>
                  <li><strong>Password</strong> (stored securely via Supabase Auth; never stored in plain text)</li>
                  <li><strong>Full name</strong> (optional, collected during sign-up)</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Order Information</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Customer name, phone number, and delivery address</li>
                  <li>Special instructions / order notes</li>
                  <li>Delivery coordinates (latitude and longitude)</li>
                  <li>Order details (items, quantities, prices)</li>
                  <li>Payment method</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Review Information</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Customer name</li>
                  <li>Phone number</li>
                  <li>Review rating and comment</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Device & Usage Data</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Browser cookies</strong> (for session management)</li>
                  <li><strong>Local storage data</strong> (cart contents and recent order history)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">2</span>
              How We Use Your Information
            </h2>
            <ul className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span><strong>Order processing:</strong> To fulfill and deliver your food orders</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span><strong>Communication:</strong> To send order confirmations, status updates, and support responses</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span><strong>Account management:</strong> To authenticate users and maintain order history</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span><strong>Service improvement:</strong> To understand how customers use our website and improve our services</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span><strong>Legal compliance:</strong> To comply with applicable laws and regulations</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">3</span>
              Data Storage and Security
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Database & Authentication</h3>
                <p>Your personal information is stored securely using <strong>Supabase</strong> (PostgreSQL) with Row Level Security (RLS) enabled. Passwords are hashed and never stored in plain text. We also support secure Google OAuth for sign-in.</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Local Storage & Sessions</h3>
                <p>Your browser may store cart contents and the last 5 order numbers locally. This data is not transmitted to our servers unless you place an order. We use secure HTTP-only cookies for admin session management.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">4</span>
              Third-Party Services
            </h2>
            <p className="mb-4">We use the following third-party services that may collect or process your data:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-800">Supabase</h3>
                <p className="text-sm mt-1">Database hosting, auth, and realtime features.</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-800">Resend</h3>
                <p className="text-sm mt-1">Sending order confirmation emails.</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-800">Google OAuth</h3>
                <p className="text-sm mt-1">Social sign-in authentication.</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-800">OpenStreetMap / Leaflet</h3>
                <p className="text-sm mt-1">Displaying delivery maps and calculating routes.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">5</span>
              Data Sharing and Disclosure
            </h2>
            <p className="mb-4 font-medium text-slate-800">
              We do <strong>not</strong> sell, trade, or rent your personal information to third parties.
            </p>
            <p>We may share your information only with trusted service providers (like Supabase and Resend), when required by law, or in connection with a merger, acquisition, or sale of assets.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">6</span>
              Cookies
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Cookie Name</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-4 font-mono text-xs">admin_auth</td>
                    <td className="p-4">Admin session authentication</td>
                    <td className="p-4">24 hours</td>
                  </tr>

                  <tr>
                    <td className="p-4 font-mono text-xs">sb-*</td>
                    <td className="p-4">Supabase user session management</td>
                    <td className="p-4">Session-based</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">7</span>
              Your Rights & Data Retention
            </h2>
            <div className="space-y-6">
              <p>You have the right to <strong>access</strong>, <strong>correct</strong>, or request <strong>deletion</strong> of your personal data. You can also opt-out of communications and request data portability.</p>
              
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="font-bold text-amber-900 mb-3">Retention Periods</h3>
                <ul className="list-disc pl-5 space-y-2 text-amber-800/80">
                  <li><strong>Account data:</strong> Retained until you delete your account</li>
                  <li><strong>Order records:</strong> Retained for business and legal purposes (typically 3-7 years)</li>
                  <li><strong>Review data:</strong> Retained indefinitely unless you request removal</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">8</span>
              Contact Us & Governing Law
            </h2>
            <div className="bg-slate-900 text-slate-300 p-8 rounded-2xl">
              <h3 className="text-white font-bold text-xl mb-4">Azlan Fast Food & BBQ Point</h3>
              <div className="space-y-3 mb-6">
                <p className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">location_on</span>
                  Main Khokhrapar no. 2.5, Malir, Karachi, Pakistan
                </p>
              </div>
              <div className="pt-6 border-t border-slate-700/50">
                <p className="text-sm">
                  This Privacy Policy is governed by and construed in accordance with the laws of Pakistan. Any disputes relating to this policy shall be subject to the exclusive jurisdiction of the courts of Karachi, Pakistan.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
