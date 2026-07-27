import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useNProgress } from "@tanem/react-nprogress";
import { useRouterState } from "@tanstack/react-router";

function Container({
  animationDuration,
  isFinished,
  children,
}: {
  animationDuration: number;
  isFinished: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        opacity: isFinished ? 0 : 1,
        pointerEvents: "none",
        transition: `opacity ${animationDuration}ms linear`,
      }}
    >
      {children}
    </div>
  );
}

function Bar({ animationDuration, progress }: { animationDuration: number; progress: number }) {
  return (
    <div
      style={{
        background: "var(--primary)",
        height: 2,
        left: 0,
        marginLeft: `${(-1 + progress) * 100}%`,
        position: "fixed",
        top: 0,
        transition: `margin-left ${animationDuration}ms linear`,
        width: "100%",
        zIndex: 9, // sidebar has z-10
      }}
    >
      <div
        style={{
          boxShadow: "0 0 10px #29d, 0 0 5px #29d",
          display: "block",
          height: "100%",
          opacity: 1,
          position: "absolute",
          right: 0,
          transform: "rotate(3deg) translate(0px, -4px)",
          width: 100,
        }}
      />
    </div>
  );
}

export function ShellProgressBar() {
  const fetchingNum = useIsFetching();
  const mutatingNum = useIsMutating();
  const isLoadingRoute = useRouterState({ select: (s) => s.isLoading });
  const pendingRequests = fetchingNum + mutatingNum + (isLoadingRoute ? 1 : 0);
  const isAnimating = pendingRequests > 0;

  const { animationDuration, isFinished, progress } = useNProgress({
    isAnimating,
  });

  return (
    <Container animationDuration={animationDuration} isFinished={isFinished}>
      <Bar animationDuration={animationDuration} progress={progress} />
    </Container>
  );
}
