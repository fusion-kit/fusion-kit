import { XCircleIcon } from "@heroicons/react/20/solid";
import React from "react";
import {
  isRouteErrorResponse, Link, useRouteError,
} from "react-router-dom";
import logo from "../assets/logo.svg";

export const ErrorPage: React.FC = () => {
  const routeError = useRouteError();

  console.error("Route error", routeError);

  if (!isResponseError(routeError)) {
    return (<UnknownError routeError={routeError} />);
  }

  if (routeError.status === 404) {
    return (<NotFoundError />);
  } else {
    return (<ResponseError responseError={routeError} />);
  }
};

function isResponseError(error: unknown): error is ErrorResponse {
  return error instanceof Response || isRouteErrorResponse(error);
}

interface ErrorResponse {
  statusText: string,
  status: number,
}

export const NotFoundResponse: React.FC = () => {
  throw new Response("Not found", { status: 404 });
};

interface UnknownErrorProps {
  routeError: unknown,
}

const UnknownError: React.FC<UnknownErrorProps> = (props) => {
  const { routeError } = props;

  return (
    <div className="p-2 sm:pt-8 m-auto max-w-md">
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">An unknown error occurred</h3>
            <div className="mt-2 text-sm text-red-700">
              {`${routeError}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotFoundError: React.FC = () => {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
      <div className="flex flex-shrink-0 justify-center">
        <a href="/" className="inline-flex">
          <span className="sr-only">FusionKit</span>
          <img
            className="h-12 w-auto"
            src={logo}
            alt=""
          />
        </a>
      </div>
      <div className="py-4">
        <div className="text-center">
          <p className="text-base font-semibold text-indigo-600">404</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Page not found.</h1>
          <p className="mt-2 text-base text-gray-500">Sorry, we couldn’t find the page you’re looking for.</p>
          <div className="mt-6">
            <Link to="/" className="text-base font-medium text-indigo-600 hover:text-indigo-500">
              Go back home
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResponseErrorProps {
  responseError: ErrorResponse,
}

const ResponseError: React.FC<ResponseErrorProps> = (props) => {
  const { responseError } = props;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
      <div className="flex flex-shrink-0 justify-center">
        <a href="/" className="inline-flex">
          <span className="sr-only">FusionKit</span>
          <img
            className="h-12 w-auto"
            src={logo}
            alt=""
          />
        </a>
      </div>
      <div className="py-4">
        <div className="text-center">
          <p className="text-base font-semibold text-indigo-600">{responseError.status}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{responseError.statusText}</h1>
          <p className="mt-2 text-base text-gray-500">An error occurred.</p>
          <div className="mt-6">
            <Link to="/" className="text-base font-medium text-indigo-600 hover:text-indigo-500">
              Go back home
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
