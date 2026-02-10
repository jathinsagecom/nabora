// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { useAuth } from '../../../lib/auth-context';
// import { createClient } from '../../../lib/supabase-browser';
// import { TipEditor, TipRenderer } from '../../../components/TipEditor';

// interface Category {
//   id: string;
//   name: string;
//   icon: string;
//   description: string | null;
//   sort_order: number;
//   is_active: boolean;
// }

// interface Tip {
//   id: string;
//   category_id: string;
//   title: string;
//   content: any;
//   cover_image_url: string | null;
//   is_published: boolean;
//   sort_order: number;
//   created_by: string;
//   created_at: string;
//   updated_at: string;
// }

// const EMOJI_OPTIONS = ['📌', '🔧', '📦', '🚨', '🏠', '🔑', '🌿', '♻️', '🔒', '💡', '📋', '🚿', '🔥', '🅿️', '🐾', '📞', '🧹', '💰', '⚡', '🎉'];

// export default function TipsPage() {
//   const { activeMembership, isAdmin, user } = useAuth();
//   const supabase = createClient();
//   const communityId = activeMembership?.community_id;

//   const [categories, setCategories] = useState<Category[]>([]);
//   const [tips, setTips] = useState<Tip[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Navigation
//   const [activeCategory, setActiveCategory] = useState<string | null>(null);
//   const [expandedTip, setExpandedTip] = useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = useState('');

//   // Category form
//   const [showCategoryForm, setShowCategoryForm] = useState(false);
//   const [editingCategory, setEditingCategory] = useState<Category | null>(null);
//   const [catName, setCatName] = useState('');
//   const [catIcon, setCatIcon] = useState('📌');
//   const [catDescription, setCatDescription] = useState('');
//   const [catSubmitting, setCatSubmitting] = useState(false);
//   const [catError, setCatError] = useState('');

//   // Tip form
//   const [showTipForm, setShowTipForm] = useState(false);
//   const [editingTip, setEditingTip] = useState<Tip | null>(null);
//   const [tipTitle, setTipTitle] = useState('');
//   const [tipContent, setTipContent] = useState<any>({});
//   const [tipCoverImage, setTipCoverImage] = useState('');
//   const [tipCategoryId, setTipCategoryId] = useState('');
//   const [tipSubmitting, setTipSubmitting] = useState(false);
//   const [tipError, setTipError] = useState('');
//   const [showPreview, setShowPreview] = useState(false);

//   const fetchData = useCallback(async () => {
//     if (!communityId) return;

//     const { data: catData } = await supabase
//       .from('tip_categories')
//       .select('*')
//       .eq('community_id', communityId)
//       .eq('is_active', true)
//       .order('sort_order', { ascending: true })
//       .order('name', { ascending: true });
//     if (catData) setCategories(catData);

//     const { data: tipData } = await supabase
//       .from('tips')
//       .select('*')
//       .eq('community_id', communityId)
//       .eq('is_published', true)
//       .order('sort_order', { ascending: true })
//       .order('created_at', { ascending: false });
//     if (tipData) setTips(tipData);

//     setLoading(false);
//   }, [communityId]);

//   useEffect(() => { fetchData(); }, [fetchData]);

//   // Filtered tips
//   const getFilteredTips = () => {
//     let filtered = tips;
//     if (activeCategory) {
//       filtered = filtered.filter((t) => t.category_id === activeCategory);
//     }
//     if (searchQuery) {
//       const q = searchQuery.toLowerCase();
//       filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
//     }
//     return filtered;
//   };

//   const getTipsByCategory = (categoryId: string) => tips.filter((t) => t.category_id === categoryId);

//   // ──── CATEGORY CRUD ────

//   const openCategoryCreate = () => {
//     setEditingCategory(null);
//     setCatName(''); setCatIcon('📌'); setCatDescription('');
//     setCatError(''); setShowCategoryForm(true);
//   };

//   const openCategoryEdit = (cat: Category) => {
//     setEditingCategory(cat);
//     setCatName(cat.name); setCatIcon(cat.icon); setCatDescription(cat.description || '');
//     setCatError(''); setShowCategoryForm(true);
//   };

//   const resetCategoryForm = () => {
//     setShowCategoryForm(false); setEditingCategory(null); setCatError('');
//   };

//   const handleCategorySubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setCatSubmitting(true); setCatError('');

//     const payload = {
//       community_id: communityId,
//       name: catName.trim(),
//       icon: catIcon,
//       description: catDescription.trim() || null,
//       sort_order: editingCategory?.sort_order || categories.length,
//     };

//     if (editingCategory) {
//       const { error } = await supabase.from('tip_categories').update(payload).eq('id', editingCategory.id);
//       if (error) { setCatError(error.message); setCatSubmitting(false); return; }
//     } else {
//       const { error } = await supabase.from('tip_categories').insert(payload);
//       if (error) { setCatError(error.message); setCatSubmitting(false); return; }
//     }

//     setCatSubmitting(false);
//     resetCategoryForm();
//     fetchData();
//   };

//   const handleCategoryDelete = async (catId: string) => {
//     const tipCount = getTipsByCategory(catId).length;
//     if (!confirm(`Delete this category${tipCount > 0 ? ` and its ${tipCount} tips` : ''}?`)) return;
//     await supabase.from('tips').delete().eq('category_id', catId);
//     await supabase.from('tip_categories').delete().eq('id', catId);
//     if (activeCategory === catId) setActiveCategory(null);
//     fetchData();
//   };

//   // ──── TIP CRUD ────

//   const openTipCreate = (categoryId?: string) => {
//     setEditingTip(null);
//     setTipTitle(''); setTipContent({}); setTipCoverImage('');
//     setTipCategoryId(categoryId || categories[0]?.id || '');
//     setTipError(''); setShowPreview(false); setShowTipForm(true);
//   };

//   const openTipEdit = (tip: Tip) => {
//     setEditingTip(tip);
//     setTipTitle(tip.title); setTipContent(tip.content); setTipCoverImage(tip.cover_image_url || '');
//     setTipCategoryId(tip.category_id);
//     setTipError(''); setShowPreview(false); setShowTipForm(true);
//   };

//   const resetTipForm = () => {
//     setShowTipForm(false); setEditingTip(null); setTipError(''); setShowPreview(false);
//   };

//   const handleTipSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setTipSubmitting(true); setTipError('');

//     const payload = {
//       community_id: communityId,
//       category_id: tipCategoryId,
//       title: tipTitle.trim(),
//       content: tipContent,
//       cover_image_url: tipCoverImage.trim() || null,
//       is_published: true,
//       sort_order: editingTip?.sort_order || getTipsByCategory(tipCategoryId).length,
//       created_by: user?.id,
//       updated_at: new Date().toISOString(),
//     };

//     if (editingTip) {
//       const { created_by, ...updatePayload } = payload;
//       const { error } = await supabase.from('tips').update(updatePayload).eq('id', editingTip.id);
//       if (error) { setTipError(error.message); setTipSubmitting(false); return; }
//     } else {
//       const { error } = await supabase.from('tips').insert(payload);
//       if (error) { setTipError(error.message); setTipSubmitting(false); return; }
//     }

//     setTipSubmitting(false);
//     resetTipForm();
//     fetchData();
//   };

//   const handleTipDelete = async (tipId: string) => {
//     if (!confirm('Delete this tip?')) return;
//     await supabase.from('tips').delete().eq('id', tipId);
//     if (expandedTip === tipId) setExpandedTip(null);
//     fetchData();
//   };

//   const filteredTips = getFilteredTips();

//   if (loading) return (
//     <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
//       <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
//     </div>
//   );

//   return (
//     <div>
//       {/* Header */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
//         <div>
//           <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Tips & Guides</h1>
//           <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
//             Helpful information for living in {activeMembership?.community?.name}
//           </p>
//         </div>
//         <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
//           <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tips..." style={{ width: 180, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }} />
//           {isAdmin && (
//             <button onClick={() => openTipCreate(activeCategory || undefined)} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
//               + New Tip
//             </button>
//           )}
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════
//           CATEGORY FORM MODAL
//          ════════════════════════════════════════════════════ */}
//       {showCategoryForm && (
//         <>
//           <div onClick={resetCategoryForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
//           <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
//               <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
//                 {editingCategory ? 'Edit Category' : 'New Category'}
//               </h3>
//               <button onClick={resetCategoryForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
//             </div>
//             <form onSubmit={handleCategorySubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
//               {catError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{catError}</div>}

//               <div>
//                 <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
//                   Category Name <span style={{ color: 'var(--error)' }}>*</span>
//                 </label>
//                 <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Maintenance" required autoFocus />
//               </div>

//               <div>
//                 <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Icon</label>
//                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
//                   {EMOJI_OPTIONS.map((e) => (
//                     <button key={e} type="button" onClick={() => setCatIcon(e)} style={{
//                       width: 36, height: 36, borderRadius: 'var(--radius-sm)',
//                       border: catIcon === e ? '2px solid var(--primary)' : '1px solid var(--border)',
//                       background: catIcon === e ? 'var(--primary-glow)' : 'var(--surface-alt)',
//                       cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
//                     }}>{e}</button>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span></label>
//                 <input type="text" value={catDescription} onChange={(e) => setCatDescription(e.target.value)} placeholder="Short description..." />
//               </div>

//               <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
//                 <button type="button" onClick={resetCategoryForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
//                 <button type="submit" className="btn-primary" disabled={catSubmitting} style={{ fontSize: 13 }}>
//                   {catSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </>
//       )}

//       {/* ════════════════════════════════════════════════════
//           TIP FORM MODAL (with editor + preview)
//          ════════════════════════════════════════════════════ */}
//       {showTipForm && (
//         <>
//           <div onClick={resetTipForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
//           <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 800, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>
//             {/* Modal header */}
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
//               <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
//                 {editingTip ? 'Edit Tip' : 'New Tip'}
//               </h3>
//               <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
//                 {/* Preview toggle */}
//                 <button type="button" onClick={() => setShowPreview(!showPreview)} style={{
//                   padding: '5px 12px', borderRadius: 'var(--radius-full)',
//                   border: showPreview ? '1px solid var(--primary)' : '1px solid var(--border)',
//                   background: showPreview ? 'var(--primary-glow)' : 'transparent',
//                   color: showPreview ? 'var(--primary)' : 'var(--text-muted)',
//                   fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
//                 }}>
//                   {showPreview ? '✏️ Editor' : '👁 Preview'}
//                 </button>
//                 <button onClick={resetTipForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
//               </div>
//             </div>

//             {/* Scrollable content */}
//             <div style={{ flex: 1, overflowY: 'auto' }}>
//               {!showPreview ? (
//                 /* ──── EDITOR VIEW ──── */
//                 <form id="tip-form" onSubmit={handleTipSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
//                   {tipError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{tipError}</div>}

//                   {/* Category + Title row */}
//                   <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
//                     <div>
//                       <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Category</label>
//                       <select value={tipCategoryId} onChange={(e) => setTipCategoryId(e.target.value)} required style={{ width: '100%' }}>
//                         {categories.map((c) => (
//                           <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div>
//                       <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
//                         Title <span style={{ color: 'var(--error)' }}>*</span>
//                       </label>
//                       <input type="text" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} placeholder="e.g. How to bleed your radiator" required />
//                     </div>
//                   </div>

//                   {/* Cover image URL */}
//                   <div>
//                     <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
//                       Cover Image URL <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
//                     </label>
//                     <input type="url" value={tipCoverImage} onChange={(e) => setTipCoverImage(e.target.value)} placeholder="https://..." />
//                     {tipCoverImage && (
//                       <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: 120 }}>
//                         <img src={tipCoverImage} alt="Cover" style={{ width: '100%', objectFit: 'cover', maxHeight: 120 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
//                       </div>
//                     )}
//                   </div>

//                   {/* Rich text editor */}
//                   <div>
//                     <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
//                       Content <span style={{ color: 'var(--error)' }}>*</span>
//                     </label>
//                     <TipEditor
//                       content={tipContent}
//                       onChange={(json) => setTipContent(json)}
//                       editable={true}
//                       placeholder="Write your tip content here... Use the toolbar for formatting."
//                     />
//                   </div>
//                 </form>
//               ) : (
//                 /* ──── PREVIEW VIEW ──── */
//                 <div style={{ padding: '24px' }}>
//                   <div style={{
//                     background: 'var(--surface-alt)', border: '1px solid var(--border)',
//                     borderRadius: 'var(--radius-lg)', overflow: 'hidden',
//                   }}>
//                     {/* Preview header */}
//                     <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
//                       <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Preview</span>
//                     </div>

//                     {/* Cover image */}
//                     {tipCoverImage && (
//                       <div style={{ maxHeight: 200, overflow: 'hidden' }}>
//                         <img src={tipCoverImage} alt="Cover" style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
//                       </div>
//                     )}

//                     {/* Category badge + title */}
//                     <div style={{ padding: '20px 24px' }}>
//                       {tipCategoryId && (
//                         <span style={{
//                           fontSize: 10, fontWeight: 600, padding: '3px 10px',
//                           borderRadius: 'var(--radius-full)',
//                           background: 'var(--primary-glow)', color: 'var(--primary)',
//                           marginBottom: 10, display: 'inline-block',
//                         }}>
//                           {categories.find((c) => c.id === tipCategoryId)?.icon} {categories.find((c) => c.id === tipCategoryId)?.name}
//                         </span>
//                       )}
//                       <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16, lineHeight: 1.3 }}>
//                         {tipTitle || 'Untitled Tip'}
//                       </h2>
//                       <TipRenderer content={tipContent} />
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Sticky footer */}
//             <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
//               <button type="button" onClick={resetTipForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
//               <button type="submit" form="tip-form" className="btn-primary" disabled={tipSubmitting || !tipTitle.trim()} style={{ fontSize: 13 }}>
//                 {tipSubmitting ? 'Saving...' : editingTip ? 'Save Changes' : 'Publish Tip'}
//               </button>
//             </div>
//           </div>
//         </>
//       )}

//       {/* ════════════════════════════════════════════════════
//           CATEGORIES
//          ════════════════════════════════════════════════════ */}
//       {categories.length === 0 && !searchQuery ? (
//         <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
//           <div style={{ fontSize: 32, marginBottom: 12 }}>💡</div>
//           <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>No tips yet.</p>
//           {isAdmin && (
//             <button onClick={openCategoryCreate} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>
//               + Create First Category
//             </button>
//           )}
//         </div>
//       ) : (
//         <>
//           {/* Category pills */}
//           <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
//             <button onClick={() => setActiveCategory(null)} style={{
//               padding: '8px 14px', borderRadius: 'var(--radius-full)',
//               border: !activeCategory ? '1px solid var(--primary)' : '1px solid var(--border)',
//               background: !activeCategory ? 'var(--primary-glow)' : 'transparent',
//               color: !activeCategory ? 'var(--primary)' : 'var(--text-muted)',
//               fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
//             }}>
//               All ({tips.length})
//             </button>
//             {categories.map((cat) => {
//               const count = getTipsByCategory(cat.id).length;
//               const isActive = activeCategory === cat.id;
//               return (
//                 <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                   <button onClick={() => setActiveCategory(isActive ? null : cat.id)} style={{
//                     padding: '8px 14px', borderRadius: 'var(--radius-full)',
//                     border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
//                     background: isActive ? 'var(--primary-glow)' : 'transparent',
//                     color: isActive ? 'var(--primary)' : 'var(--text-muted)',
//                     fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
//                   }}>
//                     {cat.icon} {cat.name} ({count})
//                   </button>
//                   {isAdmin && (
//                     <div style={{ display: 'flex', gap: 2 }}>
//                       <button onClick={() => openCategoryEdit(cat)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit category">✏️</button>
//                       <button onClick={() => handleCategoryDelete(cat.id)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete category">🗑</button>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//             {isAdmin && (
//               <button onClick={openCategoryCreate} style={{
//                 padding: '8px 14px', borderRadius: 'var(--radius-full)',
//                 border: '1px dashed var(--border)', background: 'transparent',
//                 color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
//               }}>
//                 + Category
//               </button>
//             )}
//           </div>

//           {/* ════════════════════════════════════════════════════
//               TIP CARDS
//              ════════════════════════════════════════════════════ */}
//           {filteredTips.length === 0 ? (
//             <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center' }}>
//               <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
//                 {searchQuery ? 'No tips match your search.' : 'No tips in this category yet.'}
//               </p>
//               {isAdmin && activeCategory && !searchQuery && (
//                 <button onClick={() => openTipCreate(activeCategory)} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12, marginTop: 12 }}>
//                   + Add Tip
//                 </button>
//               )}
//             </div>
//           ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//               {filteredTips.map((tip) => {
//                 const isExpanded = expandedTip === tip.id;
//                 const category = categories.find((c) => c.id === tip.category_id);

//                 return (
//                   <div key={tip.id} style={{
//                     background: 'var(--surface)', border: '1px solid var(--border)',
//                     borderRadius: 'var(--radius-lg)', overflow: 'hidden',
//                     transition: 'border-color 0.15s ease',
//                   }}>
//                     {/* Tip header — click to expand */}
//                     <button
//                       onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
//                       style={{
//                         width: '100%', display: 'flex', alignItems: 'center', gap: 12,
//                         padding: '14px 18px', border: 'none', background: 'transparent',
//                         cursor: 'pointer', textAlign: 'left',
//                       }}
//                     >
//                       {/* Cover image thumbnail */}
//                       {tip.cover_image_url && (
//                         <div style={{
//                           width: 48, height: 48, borderRadius: 'var(--radius-sm)',
//                           overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)',
//                         }}>
//                           <img src={tip.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                         </div>
//                       )}

//                       <div style={{ flex: 1, minWidth: 0 }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
//                           {category && !activeCategory && (
//                             <span style={{
//                               fontSize: 9, fontWeight: 600, padding: '2px 6px',
//                               borderRadius: 'var(--radius-full)',
//                               background: 'var(--surface-alt)', border: '1px solid var(--border)',
//                               color: 'var(--text-faint)', flexShrink: 0,
//                             }}>
//                               {category.icon} {category.name}
//                             </span>
//                           )}
//                         </div>
//                         <div style={{
//                           fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
//                           color: 'var(--text)',
//                           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
//                         }}>
//                           {tip.title}
//                         </div>
//                       </div>

//                       {/* Admin actions */}
//                       {isAdmin && (
//                         <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
//                           <button onClick={() => openTipEdit(tip)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
//                           <button onClick={() => handleTipDelete(tip.id)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
//                         </div>
//                       )}

//                       {/* Expand icon */}
//                       <span style={{
//                         fontSize: 14, color: 'var(--text-faint)',
//                         transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
//                         transition: 'transform 0.2s ease', flexShrink: 0,
//                       }}>
//                         ▼
//                       </span>
//                     </button>

//                     {/* Expanded content */}
//                     {isExpanded && (
//                       <div style={{ borderTop: '1px solid var(--border)' }}>
//                         {/* Cover image full */}
//                         {tip.cover_image_url && (
//                           <div style={{ maxHeight: 260, overflow: 'hidden' }}>
//                             <img src={tip.cover_image_url} alt="" style={{ width: '100%', objectFit: 'cover', maxHeight: 260 }} />
//                           </div>
//                         )}
//                         {/* Rich content */}
//                         <div style={{ padding: '16px 20px' }}>
//                           <TipRenderer content={tip.content} />
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }



'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';
import { TipEditor, TipRenderer } from '../../../components/TipEditor';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Tip {
  id: string;
  category_id: string;
  title: string;
  content: any;
  cover_image_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const EMOJI_OPTIONS = ['📌', '🔧', '📦', '🚨', '🏠', '🔑', '🌿', '♻️', '🔒', '💡', '📋', '🚿', '🔥', '🅿️', '🐾', '📞', '🧹', '💰', '⚡', '🎉'];

export default function TipsPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📌');
  const [catDescription, setCatDescription] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catError, setCatError] = useState('');

  // Tip form
  const [showTipForm, setShowTipForm] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [tipTitle, setTipTitle] = useState('');
  const [tipContent, setTipContent] = useState<any>({});
  const [tipCoverImage, setTipCoverImage] = useState('');
  const [tipCategoryId, setTipCategoryId] = useState('');
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const [tipError, setTipError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    const { data: catData } = await supabase
      .from('tip_categories')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (catData) setCategories(catData);

    const { data: tipData } = await supabase
      .from('tips')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (tipData) setTips(tipData);

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered tips
  const getFilteredTips = () => {
    let filtered = tips;
    if (activeCategory) {
      filtered = filtered.filter((t) => t.category_id === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
    }
    return filtered;
  };

  const getTipsByCategory = (categoryId: string) => tips.filter((t) => t.category_id === categoryId);

  // ──── CATEGORY CRUD ────

  const openCategoryCreate = () => {
    setEditingCategory(null);
    setCatName(''); setCatIcon('📌'); setCatDescription('');
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
      const { error } = await supabase.from('tip_categories').update(payload).eq('id', editingCategory.id);
      if (error) { setCatError(error.message); setCatSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('tip_categories').insert(payload);
      if (error) { setCatError(error.message); setCatSubmitting(false); return; }
    }

    setCatSubmitting(false);
    resetCategoryForm();
    fetchData();
  };

  const handleCategoryDelete = async (catId: string) => {
    const tipCount = getTipsByCategory(catId).length;
    if (!confirm(`Delete this category${tipCount > 0 ? ` and its ${tipCount} tips` : ''}?`)) return;
    await supabase.from('tips').delete().eq('category_id', catId);
    await supabase.from('tip_categories').delete().eq('id', catId);
    if (activeCategory === catId) setActiveCategory(null);
    fetchData();
  };

  // ──── TIP CRUD ────

  const openTipCreate = (categoryId?: string) => {
    setEditingTip(null);
    setTipTitle(''); setTipContent({}); setTipCoverImage('');
    setTipCategoryId(categoryId || categories[0]?.id || '');
    setTipError(''); setShowPreview(false); setShowTipForm(true);
  };

  const openTipEdit = (tip: Tip) => {
    setEditingTip(tip);
    setTipTitle(tip.title); setTipContent(tip.content); setTipCoverImage(tip.cover_image_url || '');
    setTipCategoryId(tip.category_id);
    setTipError(''); setShowPreview(false); setShowTipForm(true);
  };

  const resetTipForm = () => {
    setShowTipForm(false); setEditingTip(null); setTipError(''); setShowPreview(false);
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTipSubmitting(true); setTipError('');

    const payload = {
      community_id: communityId,
      category_id: tipCategoryId,
      title: tipTitle.trim(),
      content: tipContent,
      cover_image_url: tipCoverImage.trim() || null,
      is_published: true,
      sort_order: editingTip?.sort_order || getTipsByCategory(tipCategoryId).length,
      created_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (editingTip) {
      const { created_by, ...updatePayload } = payload;
      const { error } = await supabase.from('tips').update(updatePayload).eq('id', editingTip.id);
      if (error) { setTipError(error.message); setTipSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('tips').insert(payload);
      if (error) { setTipError(error.message); setTipSubmitting(false); return; }
    }

    setTipSubmitting(false);
    resetTipForm();
    fetchData();
  };

  const handleTipDelete = async (tipId: string) => {
    if (!confirm('Delete this tip?')) return;
    await supabase.from('tips').delete().eq('id', tipId);
    if (expandedTip === tipId) setExpandedTip(null);
    fetchData();
  };

  const filteredTips = getFilteredTips();

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
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Tips & Guides</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            Helpful information for living in {activeMembership?.community?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tips..." style={{ width: 180, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }} />
          {isAdmin && (
            <button onClick={() => openTipCreate(activeCategory || undefined)} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
              + New Tip
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          CATEGORY FORM MODAL
         ════════════════════════════════════════════════════ */}
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
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Maintenance" required autoFocus />
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
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span></label>
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

      {/* ════════════════════════════════════════════════════
          TIP FORM MODAL (with editor + preview)
         ════════════════════════════════════════════════════ */}
      {showTipForm && (
        <>
          <div onClick={resetTipForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 800, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editingTip ? 'Edit Tip' : 'New Tip'}
              </h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Preview toggle */}
                <button type="button" onClick={() => setShowPreview(!showPreview)} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  border: showPreview ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: showPreview ? 'var(--primary-glow)' : 'transparent',
                  color: showPreview ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  {showPreview ? '✏️ Editor' : '👁 Preview'}
                </button>
                <button onClick={resetTipForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!showPreview ? (
                /* ──── EDITOR VIEW ──── */
                <form id="tip-form" onSubmit={handleTipSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tipError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{tipError}</div>}

                  {/* Category + Title row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Category</label>
                      <select value={tipCategoryId} onChange={(e) => setTipCategoryId(e.target.value)} required style={{ width: '100%' }}>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                        Title <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <input type="text" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} placeholder="e.g. How to bleed your radiator" required />
                    </div>
                  </div>

                  {/* Cover image URL */}
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                      Cover Image URL <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input type="url" value={tipCoverImage} onChange={(e) => setTipCoverImage(e.target.value)} placeholder="https://..." />
                    {tipCoverImage && (
                      <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: 120 }}>
                        <img src={tipCoverImage} alt="Cover" style={{ width: '100%', objectFit: 'cover', maxHeight: 120 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>

                  {/* Rich text editor */}
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                      Content <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <TipEditor
                      content={tipContent}
                      onChange={(json) => setTipContent(json)}
                      editable={true}
                      placeholder="Write your tip content here... Use the toolbar for formatting."
                    />
                  </div>
                </form>
              ) : (
                /* ──── PREVIEW VIEW ──── */
                <div style={{ padding: '24px' }}>
                  <div style={{
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  }}>
                    {/* Preview header */}
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Preview</span>
                    </div>

                    {/* Cover image */}
                    {tipCoverImage && (
                      <div style={{ maxHeight: 200, overflow: 'hidden' }}>
                        <img src={tipCoverImage} alt="Cover" style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}

                    {/* Category badge + title */}
                    <div style={{ padding: '20px 24px' }}>
                      {tipCategoryId && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--primary-glow)', color: 'var(--primary)',
                          marginBottom: 10, display: 'inline-block',
                        }}>
                          {categories.find((c) => c.id === tipCategoryId)?.icon} {categories.find((c) => c.id === tipCategoryId)?.name}
                        </span>
                      )}
                      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16, lineHeight: 1.3 }}>
                        {tipTitle || 'Untitled Tip'}
                      </h2>
                      <TipRenderer content={tipContent} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button type="button" onClick={resetTipForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
              <button type="submit" form="tip-form" className="btn-primary" disabled={tipSubmitting || !tipTitle.trim()} style={{ fontSize: 13 }}>
                {tipSubmitting ? 'Saving...' : editingTip ? 'Save Changes' : 'Publish Tip'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          CATEGORIES
         ════════════════════════════════════════════════════ */}
      {categories.length === 0 && !searchQuery ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💡</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>No tips yet.</p>
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
              All ({tips.length})
            </button>
            {categories.map((cat) => {
              const count = getTipsByCategory(cat.id).length;
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
                      <button onClick={() => openCategoryEdit(cat)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit category">✏️</button>
                      <button onClick={() => handleCategoryDelete(cat.id)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete category">🗑</button>
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
              }}>
                + Category
              </button>
            )}
          </div>

          {/* ════════════════════════════════════════════════════
              TIP CARDS
             ════════════════════════════════════════════════════ */}
          {filteredTips.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                {searchQuery ? 'No tips match your search.' : 'No tips in this category yet.'}
              </p>
              {isAdmin && activeCategory && !searchQuery && (
                <button onClick={() => openTipCreate(activeCategory)} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12, marginTop: 12 }}>
                  + Add Tip
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTips.map((tip) => {
                const isExpanded = expandedTip === tip.id;
                const category = categories.find((c) => c.id === tip.category_id);

                return (
                  <div key={tip.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    transition: 'border-color 0.15s ease',
                  }}>
                    {/* Tip header — click to expand */}
                    <div
                      onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 18px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {/* Cover image thumbnail */}
                      {tip.cover_image_url && (
                        <div style={{
                          width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)',
                        }}>
                          <img src={tip.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          {category && !activeCategory && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: '2px 6px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--surface-alt)', border: '1px solid var(--border)',
                              color: 'var(--text-faint)', flexShrink: 0,
                            }}>
                              {category.icon} {category.name}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {tip.title}
                        </div>
                      </div>

                      {/* Admin actions */}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openTipEdit(tip)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                          <button onClick={() => handleTipDelete(tip.id)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                        </div>
                      )}

                      {/* Expand icon */}
                      <span style={{
                        fontSize: 14, color: 'var(--text-faint)',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease', flexShrink: 0,
                      }}>
                        ▼
                      </span>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        {/* Cover image full */}
                        {tip.cover_image_url && (
                          <div style={{ maxHeight: 260, overflow: 'hidden' }}>
                            <img src={tip.cover_image_url} alt="" style={{ width: '100%', objectFit: 'cover', maxHeight: 260 }} />
                          </div>
                        )}
                        {/* Rich content */}
                        <div style={{ padding: '16px 20px' }}>
                          <TipRenderer content={tip.content} />
                        </div>
                      </div>
                    )}
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