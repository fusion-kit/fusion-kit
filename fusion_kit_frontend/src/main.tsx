import { ApolloProvider } from "@apollo/client";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { graphqlClient } from "./client";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ApolloProvider client={graphqlClient}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);
