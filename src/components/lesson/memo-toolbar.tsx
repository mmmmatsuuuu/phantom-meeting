"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";

type Props = {
  editor: Editor;
};

type ToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`px-2 py-1 rounded text-sm transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function MemoToolbar({ editor }: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const handleSetLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="太字"
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="斜体"
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="見出し"
      >
        H2
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="箇条書き"
      >
        ≡
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="番号付きリスト"
      >
        1.
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="インラインコード"
      >
        {"<>"}
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="コードブロック"
      >
        {"{ }"}
      </ToolbarButton>

      {editor.isActive("codeBlock") && (
        <select
          value={editor.getAttributes("codeBlock").language ?? ""}
          onChange={(e) =>
            editor.chain().focus().setCodeBlock({ language: e.target.value || "" }).run()
          }
          onMouseDown={(e) => e.preventDefault()}
          className="text-xs border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">自動検出</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="c">C言語</option>
          <option value="xml">HTML</option>
          <option value="css">CSS</option>
        </select>
      )}

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="コールアウト"
      >
        ▌
      </ToolbarButton>

      <ToolbarButton
        onClick={() => setShowLinkInput((v) => !v)}
        isActive={editor.isActive("link") || showLinkInput}
        title="リンク"
      >
        🔗
      </ToolbarButton>

      {showLinkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetLink();
              if (e.key === "Escape") setShowLinkInput(false);
            }}
            placeholder="https://..."
            className="text-xs border rounded px-2 py-0.5 w-44 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSetLink}
            className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground"
          >
            設定
          </button>
        </div>
      )}
    </div>
  );
}
