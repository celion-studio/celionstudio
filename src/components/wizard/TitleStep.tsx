"use client";

type TitleStepProps = {
  title: string;
  onTitleChange: (value: string) => void;
};

export function TitleStep({ title, onTitleChange }: TitleStepProps) {
  return (
    <div>
      <label className="block">
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Ebook title
        </p>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Name this draft."
          className="mt-3 w-full rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>
    </div>
  );
}
