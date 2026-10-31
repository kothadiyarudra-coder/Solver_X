import {
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";

const DashboardCard = ({ title, value, change, type }) => {
  const cardData = {
    total: {
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    success: {
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    rate: {
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  };

  const data = cardData[type] || cardData.total;
  const Icon = data.icon;

  return (
    <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 transition hover:border-purple-500/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>

        <div className={`rounded-lg p-2 ${data.bg}`}>
          <Icon size={20} className={data.color} />
        </div>
      </div>

      <h2 className="mt-4 text-3xl font-bold text-white">{value}</h2>

      <p className="mt-2 text-xs text-slate-500">
        <span className="text-emerald-400">{change}</span> compared to last week
      </p>
    </div>
  );
};

export default DashboardCard;
