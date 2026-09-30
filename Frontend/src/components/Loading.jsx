export default function Loading({ label = 'Loading CamperOps…' }) {
  return <div className="loading"><span className="spinner" />{label}</div>
}
