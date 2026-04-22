interface PlaceholderNoticeProps {
  title: string;
  body: string;
}

export default function PlaceholderNotice({ title, body }: PlaceholderNoticeProps) {
  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-amber-300">{title}</p>
      <p className="mt-1 text-sm text-amber-100/80">{body}</p>
    </div>
  );
}
