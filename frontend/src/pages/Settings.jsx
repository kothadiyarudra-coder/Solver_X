import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Save,
  CheckCircle,
} from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    username: "Developer",
    email: "developer@devtrace.ai",
    emailNotifications: true,
    failureAlerts: true,
    autoRefresh: true,
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("devtraceSettings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon size={26} className="text-purple-400" />
          <h1 className="text-3xl font-bold text-white">Settings</h1>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#302345] pb-4">
          <User size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-300">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={settings.username}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#302345] pb-4">
          <Bell size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Alerts & Notifications</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg bg-[#241738]/60 border border-[#302345] cursor-pointer">
            <div>
              <span className="text-sm font-medium text-white block">Email Notifications</span>
              <span className="text-xs text-slate-400">Receive summaries of system runs</span>
            </div>
            <input
              type="checkbox"
              name="emailNotifications"
              checked={settings.emailNotifications}
              onChange={handleChange}
              className="h-5 w-5 accent-purple-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-[#241738]/60 border border-[#302345] cursor-pointer">
            <div>
              <span className="text-sm font-medium text-white block">Immediate Failure Alerts</span>
              <span className="text-xs text-slate-400">Notify immediately when a run or job fails</span>
            </div>
            <input
              type="checkbox"
              name="failureAlerts"
              checked={settings.failureAlerts}
              onChange={handleChange}
              className="h-5 w-5 accent-purple-600 rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
