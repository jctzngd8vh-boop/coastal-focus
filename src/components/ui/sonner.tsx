"use client";

import { Toaster as Sonner } from "sonner";

function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "bg-card! text-card-foreground! border-border! rounded-xl!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
