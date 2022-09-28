import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./app/AppLayout";
import { DreamPage } from "./app/dream/DreamPage";

export const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      element: <AppLayout />,
      children: [
        {
          path: "/",
          element: <DreamPage />,
        },
      ],
    },
  ]);

  return (
    <RouterProvider router={router} />
  );
};
