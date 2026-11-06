"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Avisos con el sistema visual (tokens), en vez de los colores propios de sonner. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-[18px] text-exito" strokeWidth={2} />,
      info: <InfoIcon className="size-[18px] text-primary" strokeWidth={2} />,
      warning: <TriangleAlertIcon className="size-[18px] text-advertencia" strokeWidth={2} />,
      error: <OctagonXIcon className="size-[18px] text-destructive" strokeWidth={2} />,
      loading: <Loader2Icon className="size-[18px] animate-spin text-muted-foreground" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-lg !font-sans !gap-3 !px-4 !py-3.5",
        title: "!font-semibold !text-sm",
        description: "!text-muted-foreground !text-xs",
        closeButton: "!bg-card !border-border !text-muted-foreground",
      },
    }}
    {...props}
  />
);

export { Toaster };
