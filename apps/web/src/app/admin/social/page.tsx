"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  RefreshCw,
  Copy,
  Eye,
  Edit3,
  Check,
  X,
  MessageCircle,
  Instagram,
  Image as ImageIcon,
  CheckCircle2,
  Zap,
  AlertCircle,
  PlusCircle,
  Loader2,
} from "lucide-react";

interface SocialPostRow {
  id: string;
  jobId: string;
  platform: string;
  imageUrl: string | null;
  caption: string;
  template: string;
  status: string;
  postedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  job: {
    company: string;
    role: string;
    slug: string;
    companyNormalized: string;
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
  posted: { bg: "bg-green-500/10", text: "text-green-400", label: "Posted" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
  manual_pending: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Manual" },
};

const PLATFORM_ICONS: Record<string, any> = {
  telegram: Send,
  instagram: Instagram,
  whatsapp: MessageCircle,
};

export default function AdminSocialPage() {
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platformFilter) params.set("platform", platformFilter);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/social?${params}`);
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, [platformFilter, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const updatePost = async (id: string, data: any) => {
    await fetch(`/api/admin/social/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchPosts();
  };

  const saveCaption = async (id: string) => {
    await updatePost(id, { caption: editCaption });
    setEditingId(null);
  };

  const copyCaption = (post: SocialPostRow) => {
    navigator.clipboard.writeText(post.caption);
    setBannerMessage("📋 Caption copied to clipboard!");
    setTimeout(() => setBannerMessage(null), 3000);
  };

  // === BULK ACTIONS ===

  async function handleBulkAction(action: string, platform?: string) {
    setBulkProcessing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/admin/social/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, platform }),
      });
      const data = await res.json();
      if (data.success) {
        setBannerMessage(`✅ ${data.message}`);
        setTimeout(() => setBannerMessage(null), 5000);
        fetchPosts();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error("Bulk action error:", err);
      alert("Failed to execute action");
    } finally {
      setBulkProcessing(false);
    }
  }

  const stats = {
    total: posts.length,
    pending: posts.filter((p) => p.status === "pending").length,
    posted: posts.filter((p) => p.status === "posted").length,
    failed: posts.filter((p) => p.status === "failed").length,
    manual: posts.filter((p) => p.status === "manual_pending").length,
  };

  // Group posts by job for better overview
  const jobGroups = posts.reduce((acc, post) => {
    const key = post.jobId;
    if (!acc[key]) {
      acc[key] = { job: post.job, posts: [] };
    }
    acc[key].posts.push(post);
    return acc;
  }, {} as Record<string, { job: SocialPostRow["job"]; posts: SocialPostRow[] }>);

  return (
    <div className="space-y-6">
      {/* Banner */}
      {bannerMessage && (
        <div className="bg-[#3FA66B]/10 border border-[#3FA66B]/30 text-[#3FA66B] px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={16} />
          {bannerMessage}
        </div>
      )}

      {/* Header + Bulk Actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#EDEDEF]">Social Queue</h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            One-click control: approve a job → social posts are auto-generated.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate for new jobs */}
          <button
            onClick={() => handleBulkAction("generate_for_new")}
            disabled={bulkProcessing}
            className="px-3 py-1.5 bg-[#2563EB]/10 text-[#60A5FA] text-xs font-semibold rounded-md border border-[#2563EB]/20 hover:bg-[#2563EB]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
            Generate Missing Posts
          </button>

          {/* Retry All Failed */}
          {stats.failed > 0 && (
            <button
              onClick={() => handleBulkAction("retry_all_failed")}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-md border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Retry Failed ({stats.failed})
            </button>
          )}

          {/* Mark All as Posted */}
          {stats.pending > 0 && (
            <button
              onClick={() => {
                if (confirm(`Mark all ${stats.pending} pending posts as "Posted"? Use this after you've sent them externally.`)) {
                  handleBulkAction("mark_all_posted");
                }
              }}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-[#3FA66B]/10 text-[#3FA66B] text-xs font-semibold rounded-md border border-[#3FA66B]/20 hover:bg-[#3FA66B]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Zap size={13} />
              Mark All Posted ({stats.pending})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-[#EDEDEF]" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { label: "Manual", value: stats.manual, color: "text-blue-400" },
          { label: "Posted", value: stats.posted, color: "text-green-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1C23] border border-[#2A2D37] rounded-lg p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[#6B6D75] uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-[#1A1C23] border border-[#2A2D37] rounded-md px-3 py-1.5 text-xs text-[#EDEDEF] outline-none"
        >
          <option value="">All Platforms</option>
          <option value="telegram">Telegram</option>
          <option value="instagram">Instagram</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1A1C23] border border-[#2A2D37] rounded-md px-3 py-1.5 text-xs text-[#EDEDEF] outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="posted">Posted</option>
          <option value="failed">Failed</option>
          <option value="manual_pending">Manual</option>
        </select>
        <button onClick={fetchPosts} className="p-1.5 bg-[#1A1C23] border border-[#2A2D37] rounded-md text-[#6B6D75] hover:text-[#EDEDEF]">
          <RefreshCw size={14} />
        </button>
        <span className="text-xs text-[#6B6D75] ml-auto">
          {posts.length} posts · {Object.keys(jobGroups).length} jobs
        </span>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-md max-h-[90vh] overflow-auto">
            <img src={previewImage} alt="Social post preview" className="w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Grouped by Job */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-[#6B6D75]">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="bg-[#1A1C23] border border-[#2A2D37] rounded-lg p-8 text-center">
            <Send size={24} className="mx-auto mb-2 text-[#6B6D75]" />
            <p className="text-sm text-[#6B6D75]">No social posts yet.</p>
            <p className="text-xs text-[#6B6D75] mt-1">Approve jobs from the Review Queue → social posts are auto-generated.</p>
            <button
              onClick={() => handleBulkAction("generate_for_new")}
              className="mt-4 px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-md hover:bg-[#1D4ED8] transition-colors"
            >
              Generate Posts for Published Jobs
            </button>
          </div>
        ) : (
          Object.entries(jobGroups).map(([jobId, group]) => (
            <div
              key={jobId}
              className="bg-[#1A1C23] border border-[#2A2D37] rounded-lg overflow-hidden"
            >
              {/* Job Header */}
              <div className="px-4 py-3 border-b border-[#2A2D37]/60 bg-[#15171D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#EDEDEF]">
                      {group.job.company}
                    </span>
                    <span className="text-xs text-[#6B6D75]">—</span>
                    <span className="text-xs text-[#ABABAF]">
                      {group.job.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {group.posts.map((p) => {
                      const style = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
                      const Icon = PLATFORM_ICONS[p.platform] || Send;
                      return (
                        <span
                          key={p.id}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
                          title={`${p.platform}: ${style.label}`}
                        >
                          <Icon size={10} />
                          {style.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Platform Rows */}
              <div className="divide-y divide-[#2A2D37]/40">
                {group.posts.map((post) => {
                  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.pending;
                  const PlatformIcon = PLATFORM_ICONS[post.platform] || Send;
                  const isEditing = editingId === post.id;

                  return (
                    <div key={post.id} className="px-4 py-3 hover:bg-[#1E2028] transition-colors">
                      <div className="flex gap-3">
                        {/* Platform icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#22242B] flex items-center justify-center">
                          <PlatformIcon size={14} className="text-[#6B6D75]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#EDEDEF] capitalize">{post.platform}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                          </div>

                          {/* Caption */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                rows={5}
                                className="w-full bg-[#0F1113] border border-[#2A2D37] rounded-md px-3 py-2 text-xs text-[#EDEDEF] outline-none focus:border-[#3FA66B] resize-y font-mono"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveCaption(post.id)}
                                  className="px-2.5 py-1 bg-[#3FA66B] text-white text-[10px] font-semibold rounded-md hover:bg-[#359F5F]"
                                >
                                  <Check size={11} className="inline mr-1" />Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1 bg-[#2A2D37] text-[#6B6D75] text-[10px] font-semibold rounded-md hover:text-[#EDEDEF]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#ABABAF] line-clamp-2 whitespace-pre-wrap leading-relaxed">
                              {post.caption}
                            </p>
                          )}

                          {/* Error */}
                          {post.errorMsg && (
                            <p className="text-[10px] text-red-400 bg-red-500/5 px-2 py-1 rounded flex items-center gap-1">
                              <AlertCircle size={10} />
                              {post.errorMsg}
                            </p>
                          )}

                          {/* Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                onClick={() => copyCaption(post)}
                                className="px-2 py-0.5 text-[10px] font-medium text-[#6B6D75] hover:text-[#EDEDEF] bg-[#22242B] rounded flex items-center gap-1"
                              >
                                <Copy size={10} /> Copy
                              </button>
                              <button
                                onClick={() => { setEditingId(post.id); setEditCaption(post.caption); }}
                                className="px-2 py-0.5 text-[10px] font-medium text-[#6B6D75] hover:text-[#EDEDEF] bg-[#22242B] rounded flex items-center gap-1"
                              >
                                <Edit3 size={10} /> Edit
                              </button>
                              {post.status === "failed" && (
                                <button
                                  onClick={() => updatePost(post.id, { status: "pending" })}
                                  className="px-2 py-0.5 text-[10px] font-medium text-yellow-400 bg-yellow-500/10 rounded flex items-center gap-1"
                                >
                                  <RefreshCw size={10} /> Retry
                                </button>
                              )}
                              {post.status === "pending" && (
                                <button
                                  onClick={() => updatePost(post.id, { status: "posted" })}
                                  className="px-2 py-0.5 text-[10px] font-medium text-green-400 bg-green-500/10 rounded flex items-center gap-1"
                                >
                                  <Check size={10} /> Mark Posted
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
