import { clsx } from "clsx";
import React from "react";

export interface ProgressBarProps {
  status: "loading" | "indeterminate",
  progress: number,
  label?: string,
}

export const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  const percent = Math.min(Math.max(props.progress * 100, 0), 100);

  return (
    <div className="h-full relative bg-gray-100 text-black">
      {props.label != null ? (
        <div className="absolute z-10 flex items-center justify-center inset-0">
          <span className="text-shadow-sm shadow-black/50">{props.label}</span>
        </div>
      ) : null}
      <span
        // We set a key so that changing statuses doesn't trigger a CSS
        // transition (since this causes the element to be replaced)
        key={props.status}
        className={clsx(
          "block h-full bg-50 animate-slide-background-xy-50 relative overflow-hidden transition-width duration-250",
          props.status === "loading"
            ? "bg-candystripes from-blue-200 to-blue-300"
            : "bg-candystripes from-gray-200 to-gray-300",
        )}
        style={{ width: `${percent}%` }}
      >
      </span>
    </div>
  );
};
