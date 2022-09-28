import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./app/AppLayout";
import { DreamPage } from "./app/dream/DreamPage";
import { ErrorPage, NotFoundResponse } from "./app/ErrorPage";

export const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      element: <AppLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/",
          element: <DreamPage />,
        },
        {
          path: "/*",
          errorElement: <ErrorPage />,
          element: <NotFoundResponse />,
        },
      ],
    },
  ]);

  return (
    <RouterProvider router={router} />
  );
};
