import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Mic, 
  Clock, 
  ThumbsUp, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  PhoneCall
} from 'lucide-react';
import { AnalyticsSummary, RecentInquiry } from '../types';
import { GroundingBadge } from '../components/GroundingBadge';

interface AdminDashboardViewProps {
  analytics: AnalyticsSummary;
  recentInquiries: RecentInquiry[];
  onNavigateKnowledge: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  analytics,
  recentInquiries,
  onNavigateKnowledge
}) => {
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredInquiries = recentInquiries.filter((inq) => {
    const matchCat = filterCategory === 'All' || inq.category === filterCategory;
    const matchSearch =
      inq.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
      inq.category.toLowerCase().includes(searchFilter.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Operations & Voice AI Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry, accuracy metrics, and customer inquiry streams
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onNavigateKnowledge}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Manage Knowledge Base</span>
          </button>
        </div>
      </div>

      {/* 5 Top Core KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Questions Today */}
        <div className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Inquiries Today</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {analytics.totalQueriesToday.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
            <TrendingUp className="w-3 h-3" /> +14.2% vs yesterday
          </span>
        </div>

        {/* Voice Rate */}
        <div className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Voice Queries</span>
            <Mic className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-teal-300">
            {analytics.voiceQueriesRate}%
          </div>
          <span className="text-[10px] text-teal-400 flex items-center gap-0.5 font-medium">
            <TrendingUp className="w-3 h-3" /> +6.5% voice share
          </span>
        </div>

        {/* Avg Response Time */}
        <div className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            {analytics.avgResponseTimeSeconds}s
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            Sub-second RAG search
          </span>
        </div>

        {/* Helpful Rate */}
        <div className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Satisfaction Rate</span>
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
            {analytics.helpfulRate}%
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            Positive user rating
          </span>
        </div>

        {/* Escalations */}
        <div className="p-4 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Escalations</span>
            <PhoneCall className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300">
            {analytics.escalationsCount} ({analytics.escalationRate}%)
          </div>
          <span className="text-[10px] text-slate-400">
            Routed to bank officers
          </span>
        </div>
      </div>

      {/* Popular Inquiries Grid & Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Popular Banking Topics */}
        <div className="p-5 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Popular Inquiries by Category</span>
          </h3>

          <div className="space-y-2.5">
            {analytics.popularTopics.map((topic, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{topic.topic}</span>
                  <span className="font-mono text-slate-400">
                    {topic.count} ({topic.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${topic.percentage * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-Time Queries Stream Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0D182A] border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recent Inquiries</span>
            </h3>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Cards">Cards</option>
                <option value="Security">Security</option>
                <option value="Transfers">Transfers</option>
                <option value="Accounts">Accounts</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-100 text-xs sm:text-sm">
                      {inq.query}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>{inq.timestamp}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">
                        Confidence {Math.round(inq.confidence * 100)}%
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">
                        {inq.latencySeconds}s latency
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <GroundingBadge status={inq.status} />
                    {inq.isVoice && (
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                        <Mic className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">
                    Category: <strong className="text-slate-300">{inq.category}</strong>
                  </span>

                  {inq.escalated && (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Escalated to Bank Staff</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
