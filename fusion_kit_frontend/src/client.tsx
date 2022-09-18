import {
  ApolloClient, HttpLink, InMemoryCache, split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { nonEmptyString } from "./utils";

export const BACKEND_URL = nonEmptyString(import.meta.env.VITE_BACKEND_URL) ?? window.location.href;
const GRAPHQL_URL = joinUrlPath(BACKEND_URL, "/graphql");
const GRAPHQL_WS_URL = httpUrlToWsUrl(joinUrlPath(BACKEND_URL, "/graphql"));

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
});

const wsLink = new GraphQLWsLink(createClient({
  url: GRAPHQL_WS_URL,
  lazy: true,
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    const isSubscriptionOperation = (
      definition.kind === "OperationDefinition"
      && definition.operation === "subscription"
    );

    return isSubscriptionOperation;
  },
  wsLink,
  httpLink,
);

export const graphqlClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

function httpUrlToWsUrl(url: string): string {
  const anchor = document.createElement("a");
  anchor.href = url;

  anchor.protocol = anchor.protocol === "http:" ? "ws:" : "wss:";

  return anchor.href;
}

export function joinUrlPath(url: string, path: string): string {
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
