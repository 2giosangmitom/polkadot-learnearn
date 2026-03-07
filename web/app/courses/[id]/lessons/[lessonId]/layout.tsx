/**
 * Lesson layout: uses fixed positioning to take the lesson page out of
 * normal document flow, preventing double scrollbar. The navbar is sticky
 * at h-16 (4rem), so we offset with top-16.
 */
export default function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 top-16 z-10">{children}</div>
  );
}
