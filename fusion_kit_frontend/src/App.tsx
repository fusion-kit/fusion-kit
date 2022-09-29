import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./app/AppLayout";
import { DreamPage } from "./app/dream/DreamPage";
import { ErrorPage, NotFoundResponse } from "./app/ErrorPage";
import { GalleryPage } from "./app/GalleryPage";
import { ImageLabPage } from "./app/ImageLabPage";
import { SettingsPage } from "./app/settings/SettingsPage";

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
          path: "/gallery",
          element: <GalleryPage />,
        },
        {
          path: "/image-lab",
          element: <ImageLabPage />,
        },
        {
          path: "/settings",
          element: <SettingsPage />,
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
