'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Document {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  visibility: string;
  uploaded_by: string;
  created_at: string;
}

const FILE_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  'application/pdf': { icon: '📄', label: 'PDF', color: '#EF4444' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', label: 'Excel', color: '#22C55E' },
  'application/vnd.ms-excel': { icon: '📊', label: 'Excel', color: '#22C55E' },
  'text/csv': { icon: '📊', label: 'CSV', color: '#22C55E' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', label: 'Word', color: '#3B82F6' },
  'application/msword': { icon: '📝', label: 'Word', color: '#3B82F6' },
  'image/jpeg': { icon: '🖼️', label: 'Image', color: '#A855F7' },
  'image/png': { icon: '🖼️', label: 'Image', color: '#A855F7' },
  'image/webp': { icon: '🖼️', label: 'Image', color: '#A855F7' },
  'image/gif': { icon: '🖼️', label: 'Image', color: '#A855F7' },
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const EMOJI_OPTIONS = ['📁', '📋', '🔒', '💰', '🏠', '🔧', '⚖️', '🔥', '📊', '🏗️', '📜', '🧾'];

function getFileInfo(mimeType: string) {
  return FILE_ICONS[mimeType] || { icon: '📎', label: 'File', color: 'var(--text-muted)' };
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DocumentsPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📁');
  const [catDescription, setCatDescription] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catError, setCatError] = useState('');

  // Upload form
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docCategoryId, setDocCategoryId] = useState('');
  const [docVisibility, setDocVisibility] = useState('all_residents');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    const { data: catData } = await supabase
      .from('document_categories')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (catData) setCategories(catData);

    // RLS handles visibility filtering on the backend
    const { data: docData } = await supabase
      .from('documents')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    if (docData) setDocuments(docData);

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered docs
  const getFilteredDocs = () => {
    let filtered = documents;
    if (activeCategory) {
      filtered = filtered.filter((d) => d.category_id === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getDocsByCategory = (categoryId: string) => documents.filter((d) => d.category_id === categoryId);

  // ──── CATEGORY CRUD ────

  const openCategoryCreate = () => {
    setEditingCategory(null);
    setCatName(''); setCatIcon('📁'); setCatDescription('');
    setCatError(''); setShowCategoryForm(true);
  };

  const openCategoryEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name); setCatIcon(cat.icon); setCatDescription(cat.description || '');
    setCatError(''); setShowCategoryForm(true);
  };

  const resetCategoryForm = () => {
    setShowCategoryForm(false); setEditingCategory(null); setCatError('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSubmitting(true); setCatError('');

    const payload = {
      community_id: communityId,
      name: catName.trim(),
      icon: catIcon,
      description: catDescription.trim() || null,
      sort_order: editingCategory?.sort_order || categories.length,
    };

    if (editingCategory) {
      const { error } = await supabase.from('document_categories').update(payload).eq('id', editingCategory.id);
      if (error) { setCatError(error.message); setCatSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('document_categories').insert(payload);
      if (error) { setCatError(error.message); setCatSubmitting(false); return; }
    }

    setCatSubmitting(false);
    resetCategoryForm();
    fetchData();
  };

  const handleCategoryDelete = async (catId: string) => {
    const docCount = getDocsByCategory(catId).length;
    if (!confirm(`Delete this category${docCount > 0 ? ` and its ${docCount} documents` : ''}?`)) return;
    await supabase.from('documents').delete().eq('category_id', catId);
    await supabase.from('document_categories').delete().eq('id', catId);
    if (activeCategory === catId) setActiveCategory(null);
    fetchData();
  };

  // ──── DOCUMENT CRUD ────

  const openUploadForm = (categoryId?: string) => {
    setEditingDoc(null);
    setDocTitle(''); setDocDescription(''); setDocFile(null);
    setDocCategoryId(categoryId || categories[0]?.id || '');
    setDocVisibility('all_residents');
    setUploadError(''); setUploadProgress(''); setShowUploadForm(true);
  };

  const openEditForm = (doc: Document) => {
    setEditingDoc(doc);
    setDocTitle(doc.title); setDocDescription(doc.description || '');
    setDocCategoryId(doc.category_id); setDocVisibility(doc.visibility);
    setDocFile(null);
    setUploadError(''); setUploadProgress(''); setShowUploadForm(true);
  };

  const resetUploadForm = () => {
    setShowUploadForm(false); setEditingDoc(null); setUploadError(''); setUploadProgress('');
    setDocFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('File type not supported. Please upload PDF, Word, Excel, or image files.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit.');
      return;
    }

    setUploadError('');
    setDocFile(file);
    if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true); setUploadError('');

    try {
      if (editingDoc) {
        // Update metadata only (no new file)
        if (!docFile) {
          const { error } = await supabase.from('documents').update({
            title: docTitle.trim(),
            description: docDescription.trim() || null,
            category_id: docCategoryId,
            visibility: docVisibility,
          }).eq('id', editingDoc.id);

          if (error) { setUploadError(error.message); setUploading(false); return; }
          resetUploadForm(); fetchData(); return;
        }

        // Delete old file from storage
        if (editingDoc.file_url) {
          await supabase.storage.from('documents').remove([editingDoc.file_url]);
        }
      }

      // Upload new file
      if (!docFile && !editingDoc) {
        setUploadError('Please select a file to upload.');
        setUploading(false);
        return;
      }

      let fileUrl = editingDoc?.file_url || '';
      let fileName = editingDoc?.file_name || '';
      let fileType = editingDoc?.file_type || '';
      let fileSize = editingDoc?.file_size || 0;

      if (docFile) {
        setUploadProgress('Uploading file...');
        const fileExt = docFile.name.split('.').pop();
        const filePath = `${communityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, docFile, { upsert: false });

        if (storageError) {
          setUploadError(`Upload failed: ${storageError.message}`);
          setUploading(false); setUploadProgress('');
          return;
        }

        const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(filePath, 60);
        fileUrl = filePath; // Store the path, not the signed URL
        fileName = docFile.name;
        fileType = docFile.type;
        fileSize = docFile.size;
      }

      setUploadProgress('Saving document...');

      const payload = {
        community_id: communityId,
        category_id: docCategoryId,
        title: docTitle.trim(),
        description: docDescription.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        visibility: docVisibility,
        uploaded_by: user?.id,
      };

      if (editingDoc) {
        const { uploaded_by, ...updatePayload } = payload;
        const { error } = await supabase.from('documents').update({ ...updatePayload, file_url: fileUrl, file_name: fileName, file_type: fileType, file_size: fileSize }).eq('id', editingDoc.id);
        if (error) { setUploadError(error.message); setUploading(false); setUploadProgress(''); return; }
      } else {
        const { error } = await supabase.from('documents').insert(payload);
        if (error) { setUploadError(error.message); setUploading(false); setUploadProgress(''); return; }
      }

      setUploading(false); setUploadProgress('');
      resetUploadForm();
      fetchData();
    } catch (err: any) {
      setUploadError(err.message || 'Something went wrong');
      setUploading(false); setUploadProgress('');
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await supabase.storage.from('documents').remove([doc.file_url]);
    await supabase.from('documents').delete().eq('id', doc.id);
    fetchData();
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 60);
    if (error || !data?.signedUrl) {
      alert('Failed to generate download link.');
      return;
    }

    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = doc.file_name;
    a.target = '_blank';
    a.click();
  };

  const filteredDocs = getFilteredDocs();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Documents</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            Shared files for {activeMembership?.community?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..." style={{ width: 180, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }} />
          {isAdmin && (
            <button onClick={() => openUploadForm(activeCategory || undefined)} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
              + Upload
            </button>
          )}
        </div>
      </div>

      {/* ════════ CATEGORY FORM MODAL ════════ */}
      {showCategoryForm && (
        <>
          <div onClick={resetCategoryForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={resetCategoryForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <form onSubmit={handleCategorySubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {catError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{catError}</div>}

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Category Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Legal Documents" required autoFocus />
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {EMOJI_OPTIONS.map((e) => (
                    <button key={e} type="button" onClick={() => setCatIcon(e)} style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      border: catIcon === e ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: catIcon === e ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                <input type="text" value={catDescription} onChange={(e) => setCatDescription(e.target.value)} placeholder="Short description..." />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={resetCategoryForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={catSubmitting} style={{ fontSize: 13 }}>
                  {catSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════ UPLOAD / EDIT FORM MODAL ════════ */}
      {showUploadForm && (
        <>
          <div onClick={resetUploadForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editingDoc ? 'Edit Document' : 'Upload Document'}
              </h3>
              <button onClick={resetUploadForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <form onSubmit={handleUploadSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {uploadError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{uploadError}</div>}

              {/* File upload area */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  File {!editingDoc && <span style={{ color: 'var(--error)' }}>*</span>}
                  {editingDoc && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (leave empty to keep current)</span>}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                    padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                    background: docFile ? 'color-mix(in srgb, var(--primary) 5%, var(--surface))' : 'var(--surface-alt)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {docFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <span style={{ fontSize: 24 }}>{getFileInfo(docFile.type).icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{docFile.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatFileSize(docFile.size)} · {getFileInfo(docFile.type).label}</div>
                      </div>
                    </div>
                  ) : editingDoc ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <span style={{ fontSize: 24 }}>{getFileInfo(editingDoc.file_type).icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{editingDoc.file_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Click to replace</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Click to select a file</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>PDF, Word, Excel, Images · Max 50MB</div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Category + Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Category</label>
                  <select value={docCategoryId} onChange={(e) => setDocCategoryId(e.target.value)} required style={{ width: '100%' }}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                    Title <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Building Insurance 2025" required />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Description <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder="Brief description of this document..." rows={2} style={{ resize: 'vertical', minHeight: 50 }} />
              </div>

              {/* Visibility */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Visibility</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { value: 'all_residents', label: 'All Residents', desc: 'Everyone in the community can view', icon: '👥' },
                    { value: 'owners_landlords_only', label: 'Owners & Landlords Only', desc: 'Hidden from tenants and household members', icon: '🔒' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setDocVisibility(opt.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: docVisibility === opt.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: docVisibility === opt.value ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 18 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: docVisibility === opt.value ? 'var(--primary)' : 'var(--text)' }}>{opt.label}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-faint)' }}>{opt.desc}</div>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: docVisibility === opt.value ? '5px solid var(--primary)' : '2px solid var(--border)',
                        flexShrink: 0,
                      }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {uploadProgress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{uploadProgress}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={resetUploadForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={uploading || (!docFile && !editingDoc)} style={{ fontSize: 13 }}>
                  {uploading ? 'Uploading...' : editingDoc ? 'Save Changes' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════ CATEGORIES ════════ */}
      {categories.length === 0 && !searchQuery ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>No documents yet.</p>
          {isAdmin && (
            <button onClick={openCategoryCreate} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>
              + Create First Category
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setActiveCategory(null)} style={{
              padding: '8px 14px', borderRadius: 'var(--radius-full)',
              border: !activeCategory ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: !activeCategory ? 'var(--primary-glow)' : 'transparent',
              color: !activeCategory ? 'var(--primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              All ({documents.length})
            </button>
            {categories.map((cat) => {
              const count = getDocsByCategory(cat.id).length;
              const isActive = activeCategory === cat.id;
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={() => setActiveCategory(isActive ? null : cat.id)} style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-full)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isActive ? 'var(--primary-glow)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {cat.icon} {cat.name} ({count})
                  </button>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => openCategoryEdit(cat)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10 }} title="Edit category">✏️</button>
                      <button onClick={() => handleCategoryDelete(cat.id)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10 }} title="Delete category">🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
            {isAdmin && (
              <button onClick={openCategoryCreate} style={{
                padding: '8px 14px', borderRadius: 'var(--radius-full)',
                border: '1px dashed var(--border)', background: 'transparent',
                color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>+ Category</button>
            )}
          </div>

          {/* ════════ DOCUMENT CARDS ════════ */}
          {filteredDocs.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                {searchQuery ? 'No documents match your search.' : 'No documents in this category yet.'}
              </p>
              {isAdmin && activeCategory && !searchQuery && (
                <button onClick={() => openUploadForm(activeCategory)} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12, marginTop: 12 }}>+ Upload Document</button>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocs.map((doc) => {
                const fileInfo = getFileInfo(doc.file_type);
                const category = categories.find((c) => c.id === doc.category_id);

                return (
                  <div key={doc.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    {/* File type banner */}
                    <div style={{
                      height: 4,
                      background: fileInfo.color,
                    }} />

                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Top row: icon + meta */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                          background: `color-mix(in srgb, ${fileInfo.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${fileInfo.color} 20%, transparent)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22, flexShrink: 0,
                        }}>
                          {fileInfo.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
                            color: 'var(--text)', lineHeight: 1.3, marginBottom: 3,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {doc.title}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {category && !activeCategory && (
                              <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                                {category.icon} {category.name}
                              </span>
                            )}
                            <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{fileInfo.label}</span>
                            <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{formatFileSize(doc.file_size)}</span>
                            {doc.visibility === 'owners_landlords_only' && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' }}>
                                🔒 Owners Only
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {doc.description && (
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)',
                          lineHeight: 1.5, marginBottom: 10, flex: 1,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {doc.description}
                        </p>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                          {formatDate(doc.created_at)}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isAdmin && (
                            <>
                              <button onClick={() => openEditForm(doc)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">✏️</button>
                              <button onClick={() => handleDeleteDoc(doc)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete">🗑</button>
                            </>
                          )}
                          <button onClick={() => handleDownload(doc)} style={{
                            padding: '4px 12px', borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--primary)', background: 'var(--primary-glow)',
                            color: 'var(--primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                          }}>
                            ↓ Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}