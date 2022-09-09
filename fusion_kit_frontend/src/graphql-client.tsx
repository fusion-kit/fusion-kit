import {
  ApolloClient, HttpLink, InMemoryCache,
} from "@apollo/client";
import { nonEmptyString } from "./utils";

const BACKEND_URL = nonEmptyString(import.meta.env.VITE_BACKEND_URL) ?? window.location.href;
const GRAPHQL_URL = joinUrlPath(BACKEND_URL, "/graphql");

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

function joinUrlPath(url: string, path: string): string {
  const anchor = document.createElement("a");
  anchor.href = url;

  if (anchor.pathname.endsWith("/") && path.startsWith("/")) {
    anchor.pathname += path.slice(1);
  } else if (anchor.pathname.endsWith("/") || path.startsWith("/")) {
    anchor.pathname += path;
  } else {
    anchor.pathname += `/${path}`;
  }

  return anchor.href;
}
