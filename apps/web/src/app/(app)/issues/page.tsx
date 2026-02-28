'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';
import { useSearchParams, useRouter } from 'next/navigation';

// ──── TYPES ────

interface IssueCategory {
  id: string; name: string; icon: string; description: string | null;
}

interface Issue {
  id: string; community_id: string; category_id: string | null; custom_category: string | null;
  parent_issue_id: string | null; reported_by: string; title: string; description: string | null;
  location: string | null; priority: string; status: string; assigned_to: string | null;
  is_private: boolean; resolution_notes: string | null; resolved_at: string | null;
  closed_at: string | null; reopened_count: number; report_count: number;
  created_at: string; updated_at: string;
  category?: { name: string; icon: string } | null;
  reporter?: { full_name: string; email: string } | null;
  children?: Issue[];
}

interface IssueComment {
  id: string; issue_id: string; author_id: string; content: string;
  is_internal: boolean; old_status: string | null; new_status: string | null;
  created_at: string;
  author?: { full_name: string; role?: string } | null;
}

interface IssuePhoto {
  id: string; issue_id: string; file_url: string; file_name: string | null;
  uploaded_by: string; created_at: string;
}

// ──── CONSTANTS ────

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢' },
  { value: 'acknowledged', label: 'Acknowledged', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '🔵' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  { value: 'resolved', label: 'Resolved', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '🟣' },
  { value: 'closed', label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '⚫' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { value: 'medium', label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { value: 'high', label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'emergency', label: 'Emergency', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

function getStatusConfig(status: string) { return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]; }
function getPriorityConfig(priority: string) { return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1]; }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ──── MAIN COMPONENT ────

export default function IssuesPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = activeMembership?.community_id;

  // Data
  const [issues, setIssues] = useState<Issue[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [issueComments, setIssueComments] = useState<IssueComment[]>([]);
  const [issuePhotos, setIssuePhotos] = useState<IssuePhoto[]>([]);
  const [childIssues, setChildIssues] = useState<Issue[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // List filters
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'reports'>('newest');

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [reportCustomCategory, setReportCustomCategory] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportPriority, setReportPriority] = useState('medium');
  const [reportLinkIssue, setReportLinkIssue] = useState<Issue | null>(null);
  const [reportLinkSearch, setReportLinkSearch] = useState('');
  const [reportLinkOpen, setReportLinkOpen] = useState(false);
  const [reportPhotos, setReportPhotos] = useState<File[]>([]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [commentInternal, setCommentInternal] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Admin actions on detail
  const [toast, setToast] = useState('');

  // Category management
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🔧');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Link issue on detail (admin)
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  const CATEGORY_ICONS = ['🔧', '💡', '🚿', '🔌', '🛗', '🚗', '🔒', '🧹', '🗑️', '🚪', '🏗️', '📦', '🔥', '💨', '🎵', '⚠️'];

  // ──── DATA FETCH ────

  const fetchIssues = useCallback(async () => {
    if (!communityId) return;

    const { data } = await supabase
      .from('issues')
      .select('*, category:issue_categories(name, icon), reporter:users!reported_by(full_name, email)')
      .eq('community_id', communityId)
      .is('parent_issue_id', null) // Only root issues in list
      .order('created_at', { ascending: false });
    if (data) setIssues(data);

    const { data: catData } = await supabase
      .from('issue_categories')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('sort_order').order('name');
    if (catData) setCategories(catData);

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // Handle URL param for detail view
  useEffect(() => {
    const issueId = searchParams.get('id');
    if (issueId && !activeIssue) {
      openIssueDetail(issueId);
    }
  }, [searchParams]);

  // ──── DETAIL VIEW ────

  const openIssueDetail = async (issueId: string) => {
    setDetailLoading(true);
    router.push(`/issues?id=${issueId}`, { scroll: false });

    const { data: issue } = await supabase
      .from('issues')
      .select('*, category:issue_categories(name, icon), reporter:users!reported_by(full_name, email)')
      .eq('id', issueId)
      .single();

    if (issue) {
      setActiveIssue(issue);

      const { data: comments } = await supabase
        .from('issue_comments')
        .select('*, author:users(full_name)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
      if (comments) setIssueComments(comments);

      const { data: photos } = await supabase
        .from('issue_photos')
        .select('*')
        .eq('issue_id', issueId);
      if (photos) setIssuePhotos(photos);

      const { data: children } = await supabase
        .from('issues')
        .select('*, reporter:users!reported_by(full_name)')
        .eq('parent_issue_id', issueId)
        .order('created_at', { ascending: true });
      if (children) setChildIssues(children);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setActiveIssue(null);
    setIssueComments([]);
    setIssuePhotos([]);
    setChildIssues([]);
    setCommentText('');
    setCommentInternal(false);
    router.push('/issues', { scroll: false });
  };

  const refreshDetail = async () => {
    if (!activeIssue) return;
    await openIssueDetail(activeIssue.id);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ──── ADMIN ACTIONS ────

  const handleStatusChange = async (newStatus: string) => {
    if (!activeIssue) return;
    const needsComment = newStatus === 'closed' || (newStatus === 'open' && (activeIssue.status === 'resolved' || activeIssue.status === 'closed'));
    if (needsComment && !commentText.trim()) {
      showToast('Please add a comment before ' + (newStatus === 'closed' ? 'closing' : 'reopening'));
      return;
    }

    const updates: any = { status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
    if (newStatus === 'open' && (activeIssue.status === 'resolved' || activeIssue.status === 'closed')) {
      updates.reopened_count = (activeIssue.reopened_count || 0) + 1;
      updates.resolved_at = null;
      updates.closed_at = null;
    }

    await supabase.from('issues').update(updates).eq('id', activeIssue.id);

    // Create status change comment
    const commentPayload: any = {
      issue_id: activeIssue.id,
      author_id: user?.id,
      content: commentText.trim() || `Status changed to ${newStatus}`,
      is_internal: commentInternal,
      old_status: activeIssue.status,
      new_status: newStatus,
    };
    await supabase.from('issue_comments').insert(commentPayload);
    setCommentText('');
    setCommentInternal(false);

    showToast(`Status updated to ${getStatusConfig(newStatus).label}`);
    refreshDetail();
    fetchIssues();
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!activeIssue) return;
    await supabase.from('issues').update({ priority: newPriority }).eq('id', activeIssue.id);
    showToast(`Priority updated to ${getPriorityConfig(newPriority).label}`);
    refreshDetail();
    fetchIssues();
  };

  const handleAssignChange = async (value: string) => {
    if (!activeIssue) return;
    await supabase.from('issues').update({ assigned_to: value || null }).eq('id', activeIssue.id);
    showToast(value ? `Assigned to ${value}` : 'Unassigned');
    refreshDetail();
  };

  const handleCategoryChange = async (catId: string) => {
    if (!activeIssue) return;
    await supabase.from('issues').update({ category_id: catId || null }).eq('id', activeIssue.id);
    showToast('Category updated');
    refreshDetail();
    fetchIssues();
  };

  const handlePrivacyToggle = async () => {
    if (!activeIssue) return;
    await supabase.from('issues').update({ is_private: !activeIssue.is_private }).eq('id', activeIssue.id);
    showToast(activeIssue.is_private ? 'Issue made public' : 'Issue marked private');
    refreshDetail();
    fetchIssues();
  };

  const handleLinkToParent = async (parentIssue: Issue) => {
    if (!activeIssue) return;
    // Resolve to root: if selected issue has a parent, link to that parent instead
    const rootId = parentIssue.parent_issue_id || parentIssue.id;
    await supabase.from('issues').update({ parent_issue_id: rootId }).eq('id', activeIssue.id);
    setShowLinkModal(false);
    setLinkSearch('');
    showToast('Linked to parent issue');
    closeDetail();
    fetchIssues();
  };

  const handleUnlinkChild = async (childId: string) => {
    if (!activeIssue) return;
    const parentClosed = activeIssue.status === 'resolved' || activeIssue.status === 'closed';
    const msg = parentClosed
      ? 'The parent issue is ' + activeIssue.status + '. Unlinking will reopen this as a separate open issue. Continue?'
      : 'Unlink this issue? It will become a standalone issue.';
    if (!confirm(msg)) return;

    // Unlink and reopen as independent issue
    await supabase.from('issues').update({
      parent_issue_id: null,
      status: 'open',
      resolved_at: null,
      closed_at: null,
    }).eq('id', childId);

    // Add a comment on the child for audit trail
    await supabase.from('issue_comments').insert({
      issue_id: childId,
      author_id: user?.id,
      content: `Unlinked from parent issue "${activeIssue.title}" and reopened as independent issue.`,
      is_internal: false,
      old_status: activeIssue.status,
      new_status: 'open',
    });

    showToast('Issue unlinked and reopened');
    refreshDetail();
    fetchIssues();
  };

  // ──── COMMENTS ────

  const handleAddComment = async () => {
    if (!activeIssue || !commentText.trim()) return;
    setCommentSubmitting(true);
    await supabase.from('issue_comments').insert({
      issue_id: activeIssue.id,
      author_id: user?.id,
      content: commentText.trim(),
      is_internal: commentInternal,
    });
    setCommentText('');
    setCommentInternal(false);
    setCommentSubmitting(false);
    refreshDetail();
  };

  // ──── REPORT SUBMISSION ────

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    setReportError('');

    // If linking to existing issue
    if (reportLinkIssue) {
      const rootId = reportLinkIssue.parent_issue_id || reportLinkIssue.id;
      const { error } = await supabase.from('issues').insert({
        community_id: communityId,
        parent_issue_id: rootId,
        reported_by: user?.id,
        title: reportTitle.trim(),
        description: reportDescription.trim() || null,
        category_id: reportLinkIssue.category_id,
        location: reportLocation.trim() || null,
        priority: reportPriority,
        status: 'open',
      });
      if (error) { setReportError(error.message); setReportSubmitting(false); return; }
    } else {
      // New standalone issue
      const { data: newIssue, error } = await supabase.from('issues').insert({
        community_id: communityId,
        reported_by: user?.id,
        title: reportTitle.trim(),
        description: reportDescription.trim() || null,
        category_id: reportCategory && reportCategory !== 'other' ? reportCategory : null,
        custom_category: reportCategory === 'other' ? reportCustomCategory.trim() || null : null,
        location: reportLocation.trim() || null,
        priority: reportPriority,
        status: 'open',
      }).select().single();

      if (error) { setReportError(error.message); setReportSubmitting(false); return; }

      // Upload photos
      if (newIssue && reportPhotos.length > 0) {
        for (const photo of reportPhotos) {
          const filePath = `${communityId}/${newIssue.id}/${Date.now()}_${photo.name}`;
          const { error: upErr } = await supabase.storage.from('issue-photos').upload(filePath, photo);
          if (!upErr) {
            await supabase.from('issue_photos').insert({
              issue_id: newIssue.id,
              file_url: filePath,
              file_name: photo.name,
              uploaded_by: user?.id,
            });
          }
        }
      }
    }

    setReportSubmitting(false);
    setShowReportModal(false);
    resetReportForm();
    fetchIssues();
  };

  const resetReportForm = () => {
    setReportTitle(''); setReportDescription(''); setReportCategory(''); setReportCustomCategory('');
    setReportLocation(''); setReportPriority('medium'); setReportLinkIssue(null); setReportLinkSearch('');
    setReportPhotos([]); setReportError('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - reportPhotos.length;
    setReportPhotos([...reportPhotos, ...files.slice(0, remaining)]);
  };

  const removePhoto = (idx: number) => {
    setReportPhotos(reportPhotos.filter((_, i) => i !== idx));
  };

  // ──── CATEGORY MANAGEMENT ────

  const handleCategoryCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSubmitting(true);
    await supabase.from('issue_categories').insert({
      community_id: communityId, name: catName.trim(), icon: catIcon, sort_order: categories.length,
    });
    setCatSubmitting(false);
    setShowCategoryForm(false);
    setCatName(''); setCatIcon('🔧');
    fetchIssues();
  };

  // ──── FILTER + SORT ────

  const getFilteredIssues = () => {
    let filtered = issues;
    if (filterStatus !== 'all') filtered = filtered.filter(i => i.status === filterStatus);
    if (filterCategory !== 'all') filtered = filtered.filter(i => i.category_id === filterCategory);
    if (filterPriority !== 'all') filtered = filtered.filter(i => i.priority === filterPriority);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.reporter?.full_name?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'oldest': return filtered.sort((a, b) => a.created_at.localeCompare(b.created_at));
      case 'priority': {
        const order = { emergency: 0, high: 1, medium: 2, low: 3 };
        return filtered.sort((a, b) => (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2));
      }
      case 'reports': return filtered.sort((a, b) => b.report_count - a.report_count);
      default: return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  };

  const getLinkableIssues = (search: string) => {
    return issues.filter(i =>
      (i.status === 'open' || i.status === 'acknowledged' || i.status === 'in_progress')
      && i.id !== activeIssue?.id
      && (!search || i.title.toLowerCase().includes(search.toLowerCase()))
    );
  };

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = issues.filter(i => i.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const openCount = issues.filter(i => i.status === 'open' || i.status === 'acknowledged' || i.status === 'in_progress').length;
  const resolvedThisMonth = issues.filter(i => {
    if (!i.resolved_at) return false;
    const d = new Date(i.resolved_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ──── PHOTO SIGNED URLS ────

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (issuePhotos.length === 0) return;
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const p of issuePhotos) {
        const { data } = await supabase.storage.from('issue-photos').createSignedUrl(p.file_url, 300);
        if (data?.signedUrl) urls[p.id] = data.signedUrl;
      }
      setPhotoUrls(urls);
    };
    loadUrls();
  }, [issuePhotos]);

  // ──── RENDER ────

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  // ════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════
  if (activeIssue) {
    const sc = getStatusConfig(activeIssue.status);
    const pc = getPriorityConfig(activeIssue.priority);

    if (detailLoading) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );

    return (
      <div>
        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {toast}
          </div>
        )}

        {/* Back */}
        <button onClick={closeDetail} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
          ← Back to Issues
        </button>

        <div className="issue-detail-layout">
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: pc.bg, color: pc.color }}>{pc.label}</span>
                {activeIssue.category?.name && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>{activeIssue.category.icon} {activeIssue.category.name}</span>}
                {activeIssue.custom_category && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>📋 {activeIssue.custom_category}</span>}
                {activeIssue.is_private && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🔒 Private</span>}
                {activeIssue.report_count > 1 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>👥 {activeIssue.report_count} reports</span>}
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--text)', marginBottom: 6 }}>{activeIssue.title}</h1>
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                Reported by <strong style={{ color: 'var(--text-muted)' }}>{activeIssue.reporter?.full_name}</strong> · {timeAgo(activeIssue.created_at)}
                {activeIssue.location && <span> · 📍 {activeIssue.location}</span>}
                {activeIssue.assigned_to && <span> · 👤 {activeIssue.assigned_to}</span>}
              </div>
            </div>

            {/* Description */}
            {activeIssue.description && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {activeIssue.description}
              </div>
            )}

            {/* Photos */}
            {issuePhotos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {issuePhotos.map(p => (
                  <a key={p.id} href={photoUrls[p.id] || '#'} target="_blank" rel="noopener noreferrer" style={{ width: 100, height: 100, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)', display: 'block' }}>
                    {photoUrls[p.id] ? <img src={photoUrls[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-faint)' }}>Loading...</div>}
                  </a>
                ))}
              </div>
            )}

            {/* Linked issues */}
            {childIssues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>🔗 Linked Reports ({childIssues.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {childIssues.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 8 }}>by {c.reporter?.full_name} · {timeAgo(c.created_at)}</span>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleUnlinkChild(c.id)} style={{ fontSize: 10, color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Unlink</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution notes */}
            {activeIssue.resolution_notes && (
              <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', marginBottom: 4 }}>Resolution</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeIssue.resolution_notes}</div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Activity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Issue created */}
                <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderLeft: '2px solid var(--border)', marginLeft: 8, paddingLeft: 20, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -6, top: 12, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--surface)' }} />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <strong>{activeIssue.reporter?.full_name}</strong> opened this issue · {formatDateTime(activeIssue.created_at)}
                    </div>
                  </div>
                </div>

                {/* Comments + status changes */}
                {issueComments.map(c => {
                  const isStatusChange = c.old_status && c.new_status;
                  const isInternal = c.is_internal;

                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderLeft: '2px solid var(--border)', marginLeft: 8, paddingLeft: 20, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -6, top: 12, width: 10, height: 10, borderRadius: '50%', background: isStatusChange ? getStatusConfig(c.new_status!).color : isInternal ? '#6b7280' : 'var(--primary)', border: '2px solid var(--surface)' }} />
                      <div style={{ flex: 1 }}>
                        {isStatusChange && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: c.content ? 4 : 0 }}>
                            🔄 {getStatusConfig(c.old_status!).label} → {getStatusConfig(c.new_status!).label}
                            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}> by {c.author?.full_name} · {formatDateTime(c.created_at)}</span>
                          </div>
                        )}
                        {!isStatusChange && (
                          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 4 }}>
                            {isInternal ? '🔒' : '💬'} <strong style={{ color: 'var(--text-muted)' }}>{c.author?.full_name}</strong>
                            {isInternal && <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginLeft: 6 }}>INTERNAL</span>}
                            <span> · {formatDateTime(c.created_at)}</span>
                          </div>
                        )}
                        {c.content && (!isStatusChange || c.content !== `Status changed to ${c.new_status}`) && (
                          <div style={{
                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                            padding: '8px 12px', background: isInternal ? 'rgba(107,114,128,0.08)' : 'var(--surface)',
                            border: `1px solid ${isInternal ? 'rgba(107,114,128,0.2)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap',
                          }}>
                            {c.content}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add comment */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." rows={3} style={{ resize: 'vertical', minHeight: 60, fontSize: 13, marginBottom: 10 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {isAdmin && (
                    <button type="button" onClick={() => setCommentInternal(!commentInternal)} style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                      border: commentInternal ? '1px solid #6b7280' : '1px solid var(--border)',
                      background: commentInternal ? 'rgba(107,114,128,0.12)' : 'transparent',
                      color: commentInternal ? '#6b7280' : 'var(--text-faint)', cursor: 'pointer',
                    }}>
                      🔒 Internal Note {commentInternal ? '✓' : ''}
                    </button>
                  )}
                </div>
                <button onClick={handleAddComment} disabled={commentSubmitting || !commentText.trim()} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
                  {commentSubmitting ? '...' : 'Comment'}
                </button>
              </div>
            </div>

            {/* Resident: Close or Reopen own issue */}
            {!isAdmin && activeIssue.reported_by === user?.id && (
              <>
                {/* Close — when issue is open/acknowledged/in_progress */}
                {activeIssue.status !== 'closed' && activeIssue.status !== 'resolved' && (
                  <div style={{ marginTop: 10, padding: '12px 16px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Want to close this issue?</span>
                    <button onClick={() => {
                      if (!commentText.trim()) {
                        showToast('Please add a comment explaining why you\'re closing this issue');
                        return;
                      }
                      handleStatusChange('closed');
                    }} style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-full)',
                      border: '1px solid #6b7280', background: 'rgba(107,114,128,0.1)',
                      color: '#6b7280', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}>
                      Close Issue
                    </button>
                  </div>
                )}

                {/* Reopen — when issue is resolved or closed */}
                {(activeIssue.status === 'resolved' || activeIssue.status === 'closed') && (
                  <div style={{ marginTop: 10, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Issue still happening?</span>
                    <button onClick={() => {
                      if (!commentText.trim()) {
                        showToast('Please add a comment explaining why this issue needs reopening');
                        return;
                      }
                      handleStatusChange('open');
                    }} style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-full)',
                      border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.1)',
                      color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}>
                      🔄 Reopen Issue
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Admin sidebar */}
          {isAdmin && (
            <div className="issue-detail-sidebar" style={{ width: 240, flexShrink: 0 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Manage</div>

                {/* Status */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => handleStatusChange(s.value)} disabled={s.value === activeIssue.status} style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600,
                        border: s.value === activeIssue.status ? `1px solid ${s.color}` : '1px solid var(--border)',
                        background: s.value === activeIssue.status ? s.bg : 'transparent',
                        color: s.value === activeIssue.status ? s.color : 'var(--text-muted)',
                        cursor: s.value === activeIssue.status ? 'default' : 'pointer',
                        textAlign: 'left', fontFamily: 'var(--font-body)',
                      }}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                  {(activeIssue.status === 'resolved' || activeIssue.status === 'closed') && (
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>Add a comment to reopen</div>
                  )}
                  {activeIssue.status !== 'closed' && (
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>Add a comment to close</div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</label>
                  <select value={activeIssue.priority} onChange={(e) => handlePriorityChange(e.target.value)} style={{ width: '100%', fontSize: 11, padding: '6px 8px' }}>
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                {/* Assigned to */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned To</label>
                  <input type="text" value={activeIssue.assigned_to || ''} onChange={(e) => handleAssignChange(e.target.value)} placeholder="Name or company..." style={{ fontSize: 11, padding: '6px 8px' }} />
                </div>

                {/* Category */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                  <select value={activeIssue.category_id || ''} onChange={(e) => handleCategoryChange(e.target.value)} style={{ width: '100%', fontSize: 11, padding: '6px 8px' }}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                {/* Privacy */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>🔒 Private</span>
                  <button onClick={handlePrivacyToggle} style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: activeIssue.is_private ? '#ef4444' : 'var(--border)', position: 'relative',
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: activeIssue.is_private ? 18 : 2, transition: 'left 0.2s ease' }} />
                  </button>
                </div>

                {/* Link to parent */}
                {!activeIssue.parent_issue_id && (
                  <button onClick={() => { setShowLinkModal(true); setLinkSearch(''); }} style={{
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600,
                    border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                  }}>
                    🔗 Link to Parent Issue
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Link modal */}
        {showLinkModal && (
          <>
            <div onClick={() => setShowLinkModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 12 }}>Link to Parent Issue</h3>
              <input type="text" value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} placeholder="Search open issues..." autoFocus style={{ marginBottom: 10 }} />
              <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {getLinkableIssues(linkSearch).map(i => {
                  const isc = getStatusConfig(i.status);
                  return (
                    <button key={i.id} onClick={() => handleLinkToParent(i)} style={{
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      background: 'var(--surface-alt)', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{i.title}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: isc.bg, color: isc.color }}>{isc.label}</span>
                        {i.category?.name && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{i.category.icon} {i.category.name}</span>}
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>👥 {i.report_count}</span>
                      </div>
                    </button>
                  );
                })}
                {getLinkableIssues(linkSearch).length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>No matching open issues</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════
  const filtered = getFilteredIssues();

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Issues</h1>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
            <span><strong style={{ color: 'var(--text)', fontSize: 16 }}>{openCount}</strong> open</span>
            <span><strong style={{ color: 'var(--text)', fontSize: 16 }}>{resolvedThisMonth}</strong> resolved this month</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setShowCategoryForm(true)} className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>+ Category</button>
          )}
          <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>🚨 Report Issue</button>
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('all')} style={{
          padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
          border: filterStatus === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
          background: filterStatus === 'all' ? 'var(--primary-glow)' : 'transparent',
          color: filterStatus === 'all' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}>All ({issues.length})</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
            border: filterStatus === s.value ? `1px solid ${s.color}` : '1px solid var(--border)',
            background: filterStatus === s.value ? s.bg : 'transparent',
            color: filterStatus === s.value ? s.color : 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>{s.icon} {s.label} ({statusCounts[s.value] || 0})</button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="issue-filters-bar" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search issues..." style={{ flex: 1, minWidth: 160, padding: '8px 12px', fontSize: 11, borderRadius: 'var(--radius-full)' }} />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-full)' }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-full)' }}>
          <option value="all">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-full)' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="reports">Most Reported</option>
        </select>
      </div>

      {/* Issue list */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {searchQuery || filterCategory !== 'all' || filterPriority !== 'all' ? 'No issues match your filters.' : filterStatus === 'open' ? 'No open issues — everything looks good!' : 'No issues found.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {filtered.map((issue, idx) => {
            const sc = getStatusConfig(issue.status);
            const pc = getPriorityConfig(issue.priority);
            const isClosed = issue.status === 'closed' || issue.status === 'resolved';

            return (
              <div key={issue.id} onClick={() => openIssueDetail(issue.id)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', opacity: isClosed ? 0.6 : 1,
                transition: 'background 0.1s ease',
              }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-alt)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.color, marginTop: 5, flexShrink: 0 }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{issue.title}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: pc.bg, color: pc.color }}>{pc.label}</span>
                    {issue.category?.name && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', color: 'var(--text-faint)' }}>{issue.category.icon} {issue.category.name}</span>}
                    {issue.custom_category && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', color: 'var(--text-faint)' }}>📋 {issue.custom_category}</span>}
                    {issue.is_private && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{issue.reporter?.full_name}</span>
                    <span>{timeAgo(issue.created_at)}</span>
                    {issue.location && <span>📍 {issue.location}</span>}
                    {issue.assigned_to && <span>👤 {issue.assigned_to}</span>}
                    {issue.report_count > 1 && <span style={{ color: '#8b5cf6', fontWeight: 600 }}>👥 {issue.report_count} reports</span>}
                    {issue.reopened_count > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔄 Reopened {issue.reopened_count}x</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <>
          <div onClick={() => setShowReportModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 540, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>🚨 Report an Issue</h3>
              <button onClick={() => setShowReportModal(false)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reportError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{reportError}</div>}

              {/* Link to existing */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Link to Existing Issue <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                  {reportLinkIssue ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{reportLinkIssue.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Your report will be linked to this issue</div>
                      </div>
                      <button type="button" onClick={() => setReportLinkIssue(null)} style={{ fontSize: 18, background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>×</button>
                    </div>
                  ) : (
                    <>
                      <input type="text" value={reportLinkSearch} onChange={(e) => { setReportLinkSearch(e.target.value); setReportLinkOpen(true); }} onFocus={() => setReportLinkOpen(true)} placeholder="Search open issues to link..." />
                      {reportLinkOpen && reportLinkSearch && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--card-shadow)' }}>
                          {getLinkableIssues(reportLinkSearch).map(i => {
                            const isc = getStatusConfig(i.status);
                            return (
                              <button key={i.id} type="button" onClick={() => { setReportLinkIssue(i); setReportLinkSearch(''); setReportLinkOpen(false); }} style={{
                                width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--border)',
                                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                              }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-alt)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{i.title}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: isc.bg, color: isc.color }}>{isc.label}</span>
                                  {i.category?.name && <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{i.category.icon} {i.category.name}</span>}
                                  <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>👥 {i.report_count}</span>
                                </div>
                              </button>
                            );
                          })}
                          {getLinkableIssues(reportLinkSearch).length === 0 && (
                            <div style={{ padding: '12px', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>No matching open issues</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Title <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Brief summary of the issue" required />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={3} style={{ resize: 'vertical', minHeight: 60 }} />
              </div>

              {/* Category + Location row */}
              {!reportLinkIssue && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Category</label>
                    <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Select...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      <option value="other">📋 Other</option>
                    </select>
                    {reportCategory === 'other' && (
                      <input type="text" value={reportCustomCategory} onChange={(e) => setReportCustomCategory(e.target.value)} placeholder="Describe category..." style={{ marginTop: 6, fontSize: 11 }} />
                    )}
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Location</label>
                    <input type="text" value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} placeholder="e.g. Floor 2 hallway" />
                  </div>
                </div>
              )}

              {/* Priority */}
              {!reportLinkIssue && (
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Urgency</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.value} type="button" onClick={() => setReportPriority(p.value)} style={{
                        padding: '8px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                        border: reportPriority === p.value ? `2px solid ${p.color}` : '1px solid var(--border)',
                        background: reportPriority === p.value ? p.bg : 'transparent',
                        cursor: 'pointer',
                      }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: reportPriority === p.value ? p.color : 'var(--text-muted)' }}>{p.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {!reportLinkIssue && (
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Photos <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(max 4)</span></label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {reportPhotos.map((f, idx) => (
                      <div key={idx} style={{ width: 72, height: 72, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                        <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => removePhoto(idx)} style={{
                          position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer',
                          fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                      </div>
                    ))}
                    {reportPhotos.length < 4 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                        width: 72, height: 72, borderRadius: 'var(--radius-sm)',
                        border: '2px dashed var(--border)', background: 'transparent',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: 18 }}>📷</span>
                        <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>Add</span>
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
                </div>
              )}
            </form>

            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button type="button" onClick={() => setShowReportModal(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={(e) => { e.preventDefault(); handleReportSubmit(e); }} className="btn-primary" disabled={reportSubmitting || !reportTitle.trim()} style={{ fontSize: 13 }}>
                {reportSubmitting ? 'Submitting...' : reportLinkIssue ? 'Link & Report' : 'Submit Issue'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Category form modal */}
      {showCategoryForm && (
        <>
          <div onClick={() => setShowCategoryForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 14 }}>New Issue Category</h3>
            <form onSubmit={handleCategoryCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Name</label>
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Plumbing" required autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {CATEGORY_ICONS.map(e => (
                    <button key={e} type="button" onClick={() => setCatIcon(e)} style={{
                      width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                      border: catIcon === e ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: catIcon === e ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCategoryForm(false)} className="btn-secondary" style={{ fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={catSubmitting || !catName.trim()} style={{ fontSize: 12 }}>{catSubmitting ? '...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}