import React from "react";
import { AppLayout } from "./app/AppLayout";
import { DreamPage } from "./app/dream/DreamPage";

export const App: React.FC = () => (
  <AppLayout>
    <DreamPage />
  </AppLayout>
);
