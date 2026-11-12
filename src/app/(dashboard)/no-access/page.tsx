export default function NoAccess() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-3xl font-extrabold">No access yet</h1>
      <p className="mt-2 text-sm text-muted">
        Your role doesn&apos;t include any console sections. Ask a Super Admin to update your role.
      </p>
    </div>
  );
}
