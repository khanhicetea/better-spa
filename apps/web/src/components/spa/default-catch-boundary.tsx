import {
  ErrorComponent,
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";

export function UnauthorizedError() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>403 - Forbidden</EmptyTitle>
        <EmptyDescription>You don't have permission to access this page.</EmptyDescription>
        <Button variant="default" nativeButton={false} render={<Link to="/">Back to Home</Link>} />
      </EmptyHeader>
    </Empty>
  );
}

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  if ("message" in error && error.message.includes("Unauthorized")) {
    return <UnauthorizedError />;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => {
            router.invalidate();
          }}
        >
          Try Again
        </Button>
        {isRoot ? (
          <Button variant="secondary" nativeButton={false} render={<Link to="/">Home</Link>} />
        ) : (
          <Button
            variant="secondary"
            nativeButton={false}
            render={
              <Link
                to="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.back();
                }}
              >
                Go Back
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
