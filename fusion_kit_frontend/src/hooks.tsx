import { useCallback, useState } from "react";
import { ulid } from "ulid";

interface UseStableKeys {
  getKey: (_index: number, _id?: string) => string,
}

/**
 * A React hook that generates stable keys for components for data that
 * may not be fully loaded yet. This is useful when rendering a list of
 * arrays, where the array items may eventually be filled in with a
 * stable ID, but where there may not be a stable ID initially.
 *
 * The returned `getKey` function is called with an array index, and an
 * optional loaded ID. On the first call with a given index or ID, a new
 * random key is generated. On subsequent calls, the same random key is
 * returned. If `id` is intially not set and becomes set (say, because the
 * ID value was loaded from a server), then that ID will be associated with
 * the key based on the index. Then, as long as the ID stays the same, the
 * same key will be returned even if the index changes.
 */
export function useStableKeys(): UseStableKeys {
  const [idMap, setIdMap] = useState<Record<string, string | undefined>>({});
  const [indexMap, setIndexMap] = useState<Record<string, string | undefined>>({});

  const getKey = useCallback((index: number, id?: string) => {
    if (id != null) {
      const idKey = idMap[id];
      const indexKey = indexMap[index.toString()];

      if (idKey != null) {
        // ID key already set
        return idKey;
      } else if (indexKey != null) {
        // No key was set for this ID, but a key was already set for this index,
        // so "steal" the key and associate it with the ID instead
        setIndexMap((map) => ({ ...map, [index.toString()]: undefined }));
        setIdMap((map) => ({ ...map, [id]: indexKey }));
        return indexKey;
      } else {
        // No key was set for this ID or index, so generate a new ID key
        const newKey = ulid();
        setIdMap((map) => ({ ...map, [id]: newKey }));
        return newKey;
      }
    } else {
      const indexKey = indexMap[index.toString()];
      if (indexKey != null) {
        // Index key was already set
        return indexKey;
      } else {
        // No key for this index, so generate a new index key
        const newKey = ulid();
        setIndexMap((map) => ({ ...map, [index.toString()]: newKey }));
        return newKey;
      }
    }
  }, [idMap, indexMap]);

  return { getKey };
}
