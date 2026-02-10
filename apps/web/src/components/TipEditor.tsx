'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface TipEditorProps {
  content: any;
  onChange: (json: any) => void;
  editable?: boolean;
  placeholder?: string;
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius-sm)',
        border: active ? '1px solid var(--primary)' : '1px solid transparent',
        background: active ? 'var(--primary-glow)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        cursor: 'pointer', fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = prompt('Enter link URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 2, padding: '8px 10px',
      borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)',
    }}>
      {/* Text style */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </ToolbarButton>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        H2
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        H3
      </ToolbarButton>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
        •≡
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
        1.
      </ToolbarButton>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Block */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
        ❝
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        —
      </ToolbarButton>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Media */}
      <ToolbarButton onClick={addImage} title="Insert Image">
        🖼
      </ToolbarButton>
      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add Link">
        🔗
      </ToolbarButton>
      {editor.isActive('link') && (
        <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
          ✂️
        </ToolbarButton>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Align */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
        ≡
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
        ≡
      </ToolbarButton>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '5px 4px' }} />

      {/* Undo/Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
        ↩
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
        ↪
      </ToolbarButton>
    </div>
  );
}

export function TipEditor({ content, onChange, editable = true, placeholder = 'Start writing...' }: TipEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank' } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content && Object.keys(content).length > 0 ? content : undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        style: `padding: 16px 18px; min-height: ${editable ? '200px' : '0'}; outline: none; font-family: var(--font-body); font-size: 14px; color: var(--text); line-height: 1.7;`,
      },
    },
  });

  // Sync content when switching between tips
  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div style={{
      border: editable ? '1px solid var(--border)' : 'none',
      borderRadius: editable ? 'var(--radius-md)' : 0,
      overflow: 'hidden',
      background: editable ? 'var(--surface)' : 'transparent',
    }}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// Read-only renderer for tips
export function TipRenderer({ content }: { content: any }) {
  return <TipEditor content={content} onChange={() => {}} editable={false} />;
}