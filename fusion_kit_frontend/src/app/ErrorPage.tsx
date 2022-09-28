import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";

export const ErrorPage: React.FC = () => {
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

export const NotFoundResponse: React.FC = () => {
  throw new Response("Not found", { status: 404 });
};
