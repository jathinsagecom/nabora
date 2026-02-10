// 'use client';

// import { useAuth } from '../../../lib/auth-context';

// export default function DashboardPage() {
//   const {
//     profile,
//     activeMembership,
//     activeCommunity,
//     residencies,
//     isSuperAdmin,
//     isAdmin,
//     memberships
//   } = useAuth();

//   // Filter residencies to current community
//   const communityResidencies = residencies.filter((r) => {
//     // residency is linked via unit → community
//     // For now show all current residencies
//     return r.is_current;
//   });

//   return (
//     <div>
//       {/* Welcome card */}
//       <div style={{
//         background: 'var(--surface)',
//         border: '1px solid var(--border)',
//         borderRadius: 'var(--radius-lg)',
//         padding: '28px 28px',
//         boxShadow: 'var(--glow-shadow)',
//         marginBottom: 24,
//       }}>
//         <h1 style={{
//           fontFamily: 'var(--font-heading)',
//           fontSize: 'clamp(22px, 4vw, 28px)',
//           color: 'var(--text)',
//           marginBottom: 8,
//         }}>
//           Welcome{profile?.full_name ? `, ${profile.full_name}` : ''} 👋
//         </h1>
//         <p style={{
//           fontFamily: 'var(--font-body)',
//           fontSize: 14,
//           color: 'var(--text-muted)',
//           lineHeight: 1.6,
//         }}>
//           {activeCommunity?.name
//             ? `You're viewing ${activeCommunity.name}.`
//             : "You're signed in to Nabora."}{' '}
//           {isAdmin && 'You have admin access to this community.'}
//         </p>
//       </div>

//       {/* Stats row */}
//       <div style={{
//         display: 'grid',
//         gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
//         gap: 14,
//         marginBottom: 24,
//       }}>
//         {[
//           {
//             label: 'Your Role',
//             value: activeMembership?.role === 'community_admin' ? 'Admin' : 'Resident',
//             accent: true,
//           },
//           {
//             label: 'Communities',
//             value: memberships.length.toString(),
//             accent: false,
//           },
//           {
//             label: 'Units',
//             value: communityResidencies.length.toString(),
//             accent: false,
//           },
//           ...(isSuperAdmin ? [{
//             label: 'Super Admin',
//             value: '⚡ Active',
//             accent: true,
//           }] : []),
//         ].map((stat) => (
//           <div key={stat.label} style={{
//             background: 'var(--surface)',
//             border: '1px solid var(--border)',
//             borderRadius: 'var(--radius-md)',
//             padding: '18px 20px',
//           }}>
//             <div style={{
//               fontFamily: 'var(--font-body)',
//               fontSize: 11,
//               fontWeight: 600,
//               color: 'var(--text-faint)',
//               textTransform: 'uppercase',
//               letterSpacing: 0.8,
//               marginBottom: 6,
//             }}>
//               {stat.label}
//             </div>
//             <div style={{
//               fontFamily: 'var(--font-heading)',
//               fontSize: 20,
//               fontWeight: 700,
//               color: stat.accent ? 'var(--primary)' : 'var(--text)',
//             }}>
//               {stat.value}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Residencies */}
//       {communityResidencies.length > 0 && (
//         <div style={{
//           background: 'var(--surface)',
//           border: '1px solid var(--border)',
//           borderRadius: 'var(--radius-lg)',
//           padding: 24,
//           marginBottom: 24,
//         }}>
//           <h3 style={{
//             fontFamily: 'var(--font-heading)',
//             fontSize: 16,
//             color: 'var(--text)',
//             marginBottom: 14,
//           }}>
//             Your units
//           </h3>
//           <div style={{ display: 'grid', gap: 10 }}>
//             {communityResidencies.map((r) => (
//               <div key={r.id} style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 padding: '12px 16px',
//                 background: 'var(--surface-alt)',
//                 borderRadius: 'var(--radius-md)',
//                 border: '1px solid var(--border)',
//               }}>
//                 <div>
//                   <div style={{
//                     fontFamily: 'var(--font-heading)',
//                     fontSize: 14,
//                     fontWeight: 700,
//                     color: 'var(--text)',
//                   }}>
//                     {r.unit?.unit_number}
//                   </div>
//                   {r.unit?.floor && (
//                     <div style={{
//                       fontFamily: 'var(--font-body)',
//                       fontSize: 12,
//                       color: 'var(--text-faint)',
//                       marginTop: 2,
//                     }}>
//                       {r.unit.floor} floor
//                     </div>
//                   )}
//                 </div>
//                 <div style={{ textAlign: 'right' }}>
//                   <span style={{
//                     fontSize: 11,
//                     fontWeight: 600,
//                     padding: '4px 10px',
//                     borderRadius: 'var(--radius-full)',
//                     background: r.resident_type === 'owner'
//                       ? 'var(--accent-muted)'
//                       : 'var(--primary-glow)',
//                     color: r.resident_type === 'owner'
//                       ? 'var(--accent)'
//                       : 'var(--primary)',
//                   }}>
//                     {r.resident_type.replace(/_/g, ' ')}
//                   </span>
//                   <div style={{
//                     fontFamily: 'var(--font-body)',
//                     fontSize: 11,
//                     color: 'var(--text-faint)',
//                     marginTop: 4,
//                   }}>
//                     Since {new Date(r.starts_at).toLocaleDateString('en-GB', {
//                       month: 'short',
//                       year: 'numeric',
//                     })}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Placeholder feature cards */}
//       <div style={{
//         display: 'grid',
//         gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
//         gap: 14,
//       }}>
//         {[
//           { emoji: '📰', title: 'Community Feed', desc: 'Coming soon' },
//           { emoji: '📅', title: 'Events', desc: 'Coming soon' },
//           { emoji: '📋', title: 'Notice Board', desc: 'Coming soon' },
//           { emoji: '📁', title: 'Documents', desc: 'Coming soon' },
//           { emoji: '📞', title: 'Contacts', desc: 'Coming soon' },
//           { emoji: '🔧', title: 'Services', desc: 'Phase 4' },
//         ].map((card) => (
//           <div key={card.title} style={{
//             background: 'var(--surface)',
//             border: '1px solid var(--border)',
//             borderRadius: 'var(--radius-md)',
//             padding: 20,
//             opacity: 0.5,
//             cursor: 'not-allowed',
//           }}>
//             <div style={{ fontSize: 26, marginBottom: 10 }}>{card.emoji}</div>
//             <div style={{
//               fontFamily: 'var(--font-heading)',
//               fontSize: 13,
//               fontWeight: 700,
//               color: 'var(--text)',
//               marginBottom: 4,
//             }}>
//               {card.title}
//             </div>
//             <div style={{
//               fontSize: 11,
//               color: 'var(--text-faint)',
//               fontFamily: 'var(--font-body)',
//             }}>
//               {card.desc}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';
import Link from 'next/link';

interface Post {
  id: string; type: string; title: string; content: string; image_url: string | null;
  is_pinned: boolean; is_published: boolean; published_at: string | null; created_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  reactions: { id: string; type: string; user_id: string }[];
  comments: { id: string }[];
}

interface Event {
  id: string; title: string; description: string | null; location: string | null;
  starts_at: string; ends_at: string | null; status: string; max_attendees: number | null;
  rsvps: { id: string; status: string; user_id: string }[];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function DashboardPage() {
  const { profile, activeMembership, activeCommunity, isAdmin, features, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [announcements, setAnnouncements] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'announcement' | 'general'>('general');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});

  const fetchData = useCallback(async () => {
    if (!communityId) return;
    const { data: ad } = await supabase.from('posts')
      .select('*, author:users!posts_author_id_fkey(id, full_name, avatar_url), reactions(id, type, user_id), comments(id)')
      .eq('community_id', communityId).eq('is_published', true).eq('type', 'announcement')
      .order('created_at', { ascending: false }).limit(10);
    if (ad) setAnnouncements(ad);

    const { data: pd } = await supabase.from('posts')
      .select('*, author:users!posts_author_id_fkey(id, full_name, avatar_url), reactions(id, type, user_id), comments(id)')
      .eq('community_id', communityId).eq('is_published', true)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(30);
    if (pd) setPosts(pd);

    const { data: ed } = await supabase.from('events')
      .select('*, rsvps:event_rsvps(id, status, user_id)')
      .eq('community_id', communityId).eq('is_published', true)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true }).limit(3);
    if (ed) setEvents(ed);
    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => setCarouselIndex((p) => (p + 1) % announcements.length), 6000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: carouselIndex * carouselRef.current.offsetWidth, behavior: 'smooth' });
    }
  }, [carouselIndex]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPostSubmitting(true);
    await supabase.from('posts').insert({
      community_id: communityId, author_id: user?.id, type: postType,
      title: postTitle.trim() || (postType === 'announcement' ? 'Announcement' : ''),
      content: postContent.trim(), is_published: true, published_at: new Date().toISOString(),
    });
    setPostTitle(''); setPostContent(''); setPostType('general');
    setShowCreatePost(false); setPostSubmitting(false); fetchData();
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    const existing = posts.find((p) => p.id === postId)?.reactions.find((r) => r.user_id === user?.id);
    if (existing) { await supabase.from('reactions').delete().eq('id', existing.id); }
    else { await supabase.from('reactions').insert({ community_id: communityId, post_id: postId, user_id: user?.id, type: reactionType }); }
    fetchData();
  };

  const handleTogglePin = async (postId: string, pinned: boolean) => {
    await supabase.from('posts').update({ is_pinned: !pinned }).eq('id', postId); fetchData();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', postId); fetchData();
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase.from('comments')
      .select('*, author:users!comments_author_id_fkey(id, full_name, avatar_url)')
      .eq('post_id', postId).is('parent_id', null).order('created_at', { ascending: true });
    if (data) setPostComments((prev) => ({ ...prev, [postId]: data }));
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedComments === postId) { setExpandedComments(null); }
    else { setExpandedComments(postId); await fetchComments(postId); }
    setCommentText('');
  };

  const handleSubmitComment = async (postId: string) => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    await supabase.from('comments').insert({ community_id: communityId, post_id: postId, author_id: user?.id, content: commentText.trim() });
    setCommentText(''); setCommentSubmitting(false);
    await fetchComments(postId); fetchData();
  };

  const handleRsvp = async (eventId: string, status: string) => {
    const existing = events.find((e) => e.id === eventId)?.rsvps.find((r) => r.user_id === user?.id);
    if (existing) {
      if (existing.status === status) await supabase.from('event_rsvps').delete().eq('id', existing.id);
      else await supabase.from('event_rsvps').update({ status }).eq('id', existing.id);
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user?.id, status });
    }
    fetchData();
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div>
      {/* ANNOUNCEMENTS CAROUSEL */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div ref={carouselRef} style={{ display: 'flex', overflow: 'hidden', scrollSnapType: 'x mandatory', borderRadius: 'var(--radius-lg)' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{
                  flex: '0 0 100%', scrollSnapAlign: 'start',
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, var(--surface)), color-mix(in srgb, var(--accent) 10%, var(--surface)))',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))',
                  borderRadius: 'var(--radius-lg)', padding: 'clamp(20px, 4vw, 28px)', minHeight: 120,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: 'white', letterSpacing: 0.5, textTransform: 'uppercase' }}>Announcement</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(a.published_at || a.created_at)}</span>
                    {a.is_pinned && <span style={{ fontSize: 12 }} title="Pinned">📌</span>}
                  </div>
                  {a.title && <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{a.title}</h3>}
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.content}</p>
                  {a.author && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-faint)' }}>— {a.author.full_name}</div>}
                </div>
              ))}
            </div>
            {announcements.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {announcements.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIndex(i)} style={{
                    width: carouselIndex === i ? 20 : 8, height: 8, borderRadius: 4, border: 'none',
                    background: carouselIndex === i ? 'var(--primary)' : 'var(--border)', cursor: 'pointer', transition: 'all 0.3s ease',
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="home-layout">
        {/* FEED */}
        <div className="home-feed">
          {/* Create post */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 16, overflow: 'hidden' }}>
            {!showCreatePost ? (
              <button onClick={() => setShowCreatePost(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-faint)' }}>Share something with your community...</span>
              </button>
            ) : (
              <form onSubmit={handleCreatePost} style={{ padding: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{ value: 'general', label: 'General' }, { value: 'announcement', label: 'Announcement' }].map((t) => (
                        <button key={t.value} type="button" onClick={() => setPostType(t.value as any)} style={{
                          padding: '5px 12px', borderRadius: 'var(--radius-full)',
                          border: postType === t.value ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: postType === t.value ? 'var(--primary-glow)' : 'transparent',
                          color: postType === t.value ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}>{t.label}</button>
                      ))}
                    </div>
                  )}
                  {(postType === 'announcement' || postTitle) && (
                    <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title (optional)" style={{ fontWeight: 600, fontSize: 15 }} />
                  )}
                  <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder={postType === 'announcement' ? "Write your announcement..." : "What's on your mind?"} rows={3} autoFocus style={{ resize: 'vertical', minHeight: 80, fontSize: 14 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={() => { setShowCreatePost(false); setPostTitle(''); setPostContent(''); }} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={postSubmitting || !postContent.trim()} style={{ width: 'auto', padding: '8px 20px', fontSize: 12 }}>{postSubmitting ? 'Posting...' : 'Post'}</button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Posts */}
          {posts.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((post) => {
                const userReaction = post.reactions.find((r) => r.user_id === user?.id);
                const likeCount = post.reactions.filter((r) => r.type === 'like').length;
                const heartCount = post.reactions.filter((r) => r.type === 'heart').length;
                const celebrateCount = post.reactions.filter((r) => r.type === 'celebrate').length;
                const commentCount = post.comments.length;
                const isAuthor = post.author?.id === user?.id;
                const comments = postComments[post.id] || [];

                return (
                  <div key={post.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                        {post.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {post.author?.full_name || 'Unknown'}
                          {post.is_pinned && <span style={{ fontSize: 11 }}>📌</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{timeAgo(post.published_at || post.created_at)}</span>
                          {post.type === 'announcement' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--primary-glow)', color: 'var(--primary)' }}>Announcement</span>}
                        </div>
                      </div>
                      {(isAdmin || isAuthor) && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isAdmin && <button onClick={() => handleTogglePin(post.id, post.is_pinned)} title={post.is_pinned ? 'Unpin' : 'Pin'} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: post.is_pinned ? 'var(--primary)' : 'var(--text-faint)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📌</button>}
                          <button onClick={() => handleDeletePost(post.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '12px 18px 14px' }}>
                      {post.title && post.title !== 'Announcement' && <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{post.title}</h4>}
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                    </div>

                    {/* Reactions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[{ type: 'like', emoji: '👍', count: likeCount }, { type: 'heart', emoji: '❤️', count: heartCount }, { type: 'celebrate', emoji: '🎉', count: celebrateCount }].map((r) => (
                          <button key={r.type} onClick={() => handleReaction(post.id, r.type)} style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '10px 10px', border: 'none',
                            background: userReaction?.type === r.type ? 'var(--primary-glow)' : 'transparent',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          }}>
                            <span style={{ fontSize: 15 }}>{r.emoji}</span>
                            {r.count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: userReaction?.type === r.type ? 'var(--primary)' : 'var(--text-faint)' }}>{r.count}</span>}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => handleToggleComments(post.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '10px 10px', border: 'none',
                        background: expandedComments === post.id ? 'var(--primary-glow)' : 'transparent',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}>
                        <span style={{ fontSize: 14 }}>💬</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: expandedComments === post.id ? 'var(--primary)' : 'var(--text-faint)' }}>{commentCount}</span>
                      </button>
                    </div>

                    {/* Comments */}
                    {expandedComments === post.id && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 14px', background: 'var(--surface-alt)' }}>
                        {comments.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                            {comments.map((c: any) => (
                              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                                  {c.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '8px 12px' }}>
                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.author?.full_name}</span>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</p>
                                  </div>
                                  <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 4 }}>{timeAgo(c.created_at)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." style={{ fontSize: 12, padding: '8px 12px', borderRadius: 'var(--radius-full)' }}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(post.id); } }} />
                            <button onClick={() => handleSubmitComment(post.id)} disabled={commentSubmitting || !commentText.trim()} style={{
                              padding: '8px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                              background: commentText.trim() ? 'var(--primary)' : 'var(--border)',
                              color: commentText.trim() ? 'white' : 'var(--text-faint)',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                            }}>↑</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EVENTS WIDGET */}
        <div className="home-events-widget">
          <div className="events-desktop">
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>Upcoming Events</h3>
                {features.events !== false && <Link href="/events" style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>View all →</Link>}
              </div>
              {events.length === 0 ? (
                <div style={{ padding: '28px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                  <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>No upcoming events</p>
                </div>
              ) : (
                <div style={{ padding: '8px 12px' }}>
                  {events.map((event) => {
                    const date = formatEventDate(event.starts_at);
                    const goingCount = event.rsvps.filter((r) => r.status === 'going').length;
                    const userRsvp = event.rsvps.find((r) => r.user_id === user?.id);
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: 12, padding: '10px 6px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 46, height: 50, borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{date.day}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--primary)', letterSpacing: 0.5 }}>{date.month}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span>🕐 {date.time}</span>
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{goingCount} going</span>
                            {['going', 'maybe', 'not_going'].map((s) => (
                              <button key={s} onClick={() => handleRsvp(event.id, s)} style={{
                                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                border: userRsvp?.status === s ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: userRsvp?.status === s ? 'var(--primary-glow)' : 'transparent',
                                color: userRsvp?.status === s ? 'var(--primary)' : 'var(--text-faint)',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                              }}>{s === 'going' ? '✓ Going' : s === 'maybe' ? '? Maybe' : '✗ No'}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="events-mobile">
            {events.length > 0 && (
              <Link href="/events" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{events.length} upcoming event{events.length > 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Next: {events[0].title}</div>
                  </div>
                  <span style={{ color: 'var(--primary)', fontSize: 18 }}>→</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}