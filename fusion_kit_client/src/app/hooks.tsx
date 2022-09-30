import { useQuery } from "@apollo/client";
import { IsUpdateAvailableDocument } from "../generated/graphql";

export function useIsUpdateAvailable(): boolean {
  const { data } = useQuery(IsUpdateAvailableDocument);

  return data?.isUpdateAvailable ?? false;
}
