export default function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 top-16 z-10">{children}</div>;
}
