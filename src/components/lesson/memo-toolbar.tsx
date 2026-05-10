"use client";

import type { Editor } from "@tiptap/react";
import { useState, useRef } from "react";

type Props = {
  editor: Editor;
  codeBlockLang: string;
  isCodeBlockActive: boolean;
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

const TABLE_MAX = 6;

function TableGrid({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  return (
    <div className="p-2 bg-background border rounded-md shadow-md">
      <p className="text-xs text-muted-foreground mb-1.5 text-center">
        {hover.rows > 0 ? `${hover.rows} × ${hover.cols}` : "行 × 列を選択"}
      </p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${TABLE_MAX}, 1fr)` }}>
        {Array.from({ length: TABLE_MAX * TABLE_MAX }, (_, i) => {
          const row = Math.floor(i / TABLE_MAX) + 1;
          const col = (i % TABLE_MAX) + 1;
          const active = row <= hover.rows && col <= hover.cols;
          return (
            <button
              key={i}
              type="button"
              className={`w-5 h-5 rounded-sm border transition-colors ${
                active ? "bg-primary border-primary" : "bg-muted/50 border-border hover:bg-muted"
              }`}
              onMouseEnter={() => setHover({ rows: row, cols: col })}
              onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
              onClick={() => onSelect(row, col)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function MemoToolbar({ editor, codeBlockLang, isCodeBlockActive }: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showTableGrid, setShowTableGrid] = useState(false);
  const tableButtonRef = useRef<HTMLButtonElement>(null);

  const handleSetLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableGrid(false);
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

      {isCodeBlockActive && (
        <select
          value={codeBlockLang}
          onChange={(e) =>
            editor.chain().focus().updateAttributes("codeBlock", { language: e.target.value || null }).run()
          }
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

      <div className="relative">
        <button
          ref={tableButtonRef}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setShowTableGrid((v) => !v);
            setShowLinkInput(false);
          }}
          title="表を挿入"
          className={`px-2 py-1 rounded text-sm transition-colors ${
            editor.isActive("table")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          ⊞
        </button>
        {showTableGrid && (
          <div className="absolute top-full left-0 z-50 mt-1">
            <TableGrid onSelect={handleInsertTable} />
          </div>
        )}
      </div>

      {editor.isActive("table") && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="行を追加"
          >
            +行
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="列を追加"
          >
            +列
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="行を削除"
          >
            −行
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="列を削除"
          >
            −列
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="表を削除"
          >
            🗑
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
