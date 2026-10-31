import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, CheckCircle, XCircle, Inbox } from "lucide-react";

export default function Runtime({ runs = [] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-xl border border-[#302345] bg-[#1E1531]">
      <div className="flex items-center justify-between border-b border-[#302345] p-5">
        <div>
          <h2 className="font-semibold text-white">Recent Runs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Track your latest executions from MongoDB
          </p>
        </div>

        <button
          onClick={() => navigate("/runs")}
          className="text-sm text-purple-400 hover:text-purple-300 transition"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#241738] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Run ID</th>
              <th className="px-5 py-4">Execution</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Duration</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#302345]">
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  No runs available yet.
                </td>
              </tr>
            ) : (
              runs.map((run) => {
                const id = run.runId || run.id || run._id;
                const isSuccess = run.status === "success";
                return (
                  <tr
                    key={id}
                    className="text-sm hover:bg-[#281d3e] transition cursor-pointer"
                    onClick={() => navigate(`/runs/${id}`)}
                  >
                    <td className="px-5 py-4 font-medium text-purple-400">
                      {id}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {run.name}
                    </td>

                    <td className="px-5 py-4">
                      {isSuccess ? (
                        <span className="flex items-center gap-2 text-emerald-400 text-xs">
                          <CheckCircle size={15} />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-400 text-xs">
                          <XCircle size={15} />
                          {run.status || "Failed"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        {run.durationMs ? `${run.durationMs}ms` : run.duration || "0ms"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {run.startedAt ? new Date(run.startedAt).toLocaleDateString() : run.date || "N/A"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/runs/${id}`);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-purple-500/10 hover:text-purple-400 transition"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
