export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-label="内容加载中">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
    </div>
  );
}
