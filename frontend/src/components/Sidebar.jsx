import { NavLink } from "react-router-dom";
import {
  FolderKanban,
  AlertCircle,
  Gauge,
  Rocket,
  Compass,
  LayoutDashboard,
  BrainCircuit,
  Activity,
  BarChart3,
  CircleHelp,
  Settings,
  ChevronLeft,
  Hexagon,
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

const bottomNavItems = [
  { label: "Activity", to: "/activity", icon: Activity },
  { label: "Stats", to: "/stats", icon: BarChart3 },
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
          <Hexagon className="h-7 w-7 text-purple-400" strokeWidth={1.8} />
          <span className="text-base font-semibold tracking-wide text-slate-100">
            DevTrace AI
          </span>
        </div>
        <span className="mt-1 truncate pl-[38px] text-xs text-slate-500">
          developer@devtrace.ai
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

        {/* Divider */}
        <div className="mx-4 my-3 border-t border-slate-700/60" />

        {/* Secondary navigation */}
        <ul className="space-y-0.5">
          {bottomNavItems.map(({ label, to, icon: Icon }) => (
            <li key={label}>
              <NavLink to={to} className={navLinkClasses}>
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
