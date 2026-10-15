"use client";

import { Eye, Code2 } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0B1E3D] dark:text-orange-400 shadow-sm">
          <Code2 size={12} />
          Edit HTML
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
          <Eye size={12} />
          Preview below
        </span>

        <span className="ml-auto pr-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          HTML supported
        </span>
      </div>

      {/* Editor + Preview */}
      <div className="grid gap-0 lg:grid-cols-2">
        {/* Editor */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={16}
          spellCheck={false}
          placeholder={`<h2>Course Overview</h2>\n<p>Describe what students will learn…</p>\n<ul>\n  <li>Key outcome one</li>\n  <li>Key outcome two</li>\n</ul>`}
          className="
            w-full resize-y border-0 bg-white dark:bg-zinc-900 px-4 py-3
            font-mono text-[13px] leading-6 text-[#0B1E3D] dark:text-zinc-100
            placeholder:text-zinc-400
            focus:outline-none focus:ring-0
            disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/60 disabled:text-zinc-400
            lg:border-r lg:border-zinc-200 dark:lg:border-zinc-700
          "
        />

        {/* Preview */}
        <div className="bg-white dark:bg-zinc-900 px-4 py-3 lg:max-h-105 lg:overflow-y-auto">
          {value.trim() ? (
            <div
              className="
                course-html-preview max-w-none text-sm leading-7 text-zinc-600 dark:text-zinc-400
                [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#0B1E3D] dark:[&_h1]:text-white
                [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#0B1E3D] dark:[&_h2]:text-white
                [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[#0B1E3D] dark:[&_h3]:text-white
                [&_p]:mb-3
                [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5
                [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5
                [&_li]:mb-1
                [&_strong]:font-semibold [&_strong]:text-[#0B1E3D] dark:[&_strong]:text-white
                [&_a]:text-orange-500 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-orange-600 dark:[&_a]:text-orange-400 dark:[&_a]:hover:text-orange-300
              "
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-sm italic text-zinc-400">
              Preview will appear here as you type.
            </p>
          )}
        </div>
      </div>

      {/* Help */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5">
        <p className="text-[11px] leading-5 text-zinc-400">
          Use tags such as{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;h2&gt;</code>,{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;p&gt;</code>,{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;ul&gt;</code>,{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;li&gt;</code>,{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;strong&gt;</code>,{" "}
          <code className="rounded-sm bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[10px] text-[#0B1E3D] dark:text-orange-400">&lt;a&gt;</code>.
        </p>
      </div>
    </div>
  );
}