import React from "react";
import { XCircleIcon } from "@heroicons/react/20/solid";

export const ErrorBox: React.FC<React.PropsWithChildren> = (props) => (
  <div className="rounded-md bg-red-50 p-4 my-4">
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
