import React from "react";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";

interface ErrorBoxProps {
  className?: string,
}

export const ErrorBox: React.FC<React.PropsWithChildren<ErrorBoxProps>> = (props) => (
  <div
    className={clsx(
      "rounded-md bg-red-50 p-4 my-4",
      props.className,
    )}
  >
    <div className="flex">
      <div className="flex-shrink-0">
        <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
      </div>
      <div className="ml-3 text-sm text-red-700">
        {props.children}
      </div>
    </div>
  </div>
);
