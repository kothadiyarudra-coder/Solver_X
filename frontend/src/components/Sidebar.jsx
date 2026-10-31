import { NavLink } from "react-router-dom";
import {
  FolderKanban,
  AlertCircle,
  Gauge,
  Rocket,
  Compass,
  LayoutDashboard,
  BrainCircuit,
  CircleHelp,
  Settings,
  ChevronLeft,
} from "lucide-react";

const mainNavItems = [
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Issues", to: "/issues", icon: AlertCircle },
  { label: "Performance", to: "/performance", icon: Gauge },
  { label: "Releases", to: "/compare", icon: Rocket },
  { label: "Discover", to: "/discover", icon: Compass },
  { label: "Dashboards", to: "/dashboard", icon: LayoutDashboard },
  { label: "AI Diagnosis", to: "/diagnosis", icon: BrainCircuit },
];

const navLinkClasses = ({ isActive }) =>
  [
    "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors duration-150",
    isActive
      ? "border-l-[3px] border-purple-500 bg-purple-500/10 text-purple-400 pl-[13px]"
      : "border-l-[3px] border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
  ].join(" ");

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-700/50 bg-[#1B1124]">
      {/* Brand / Identity */}
      <div className="flex flex-col gap-1 px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-sky-500 shadow-md shadow-purple-950/40 p-1">
            <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5 text-white" stroke="currentColor">
              <path
                d="M7 6L25 26M25 6L7 26"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="white"
              />
              <circle cx="16" cy="16" r="3" fill="#38BDF8" />
            </svg>
          </div>
          <span className="text-lg font-extrabold tracking-wide text-white">
            Solver<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">_X</span>
          </span>
        </div>
        <span className="mt-0.5 truncate pl-[42px] text-[11px] text-slate-400 font-mono">
          app.solver-x.ai
        </span>
      </div>

      {/* Main navigation */}
      <nav className="mt-1 flex flex-1 flex-col overflow-y-auto">
        <ul className="space-y-0.5">
          {mainNavItems.map(({ label, to, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={navLinkClasses}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer links */}
        <div className="space-y-0.5 border-t border-slate-700/60 py-3">
          <NavLink
            to="/help"
            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200 hover:bg-white/[0.04]"
          >
            <CircleHelp className="h-[18px] w-[18px] shrink-0" />
            Help
          </NavLink>

          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200 hover:bg-white/[0.04]"
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            Settings
          </NavLink>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <ChevronLeft className="h-[18px] w-[18px] shrink-0" />
            Collapse
          </button>
        </div>
      </nav>
    </aside>
  );
}
