import { onMounted, ref } from 'vue';
import { DocumentNode } from 'graphql';
import { TypedDocumentNode, useClientHandle } from '@urql/vue';

export function usePagedQuery<
  Result,
  Vars extends Record<string, any>,
  ListItem
>(
  query: string | TypedDocumentNode<Result, Vars> | DocumentNode,
  getList: (result: Result) => ListItem[],
  getCursor: (value: ListItem) => string,
  itemsPerPage: number,
  variables: Vars
) {
  const { client } = useClientHandle();
  const fetching = ref(true);
  const error = ref(false);
  const list = ref<ListItem[]>([]);
  const currentPage = ref(0);
  const hasNextPage = ref(true);

  const fetchNextPage = async () => {
    fetching.value = true;

    try {
      const cursor =
        list.value.length > 0 ? getCursor(list.value.at(-1)) : undefined;
      const variablesForPagination = {
        ...variables,
        take: itemsPerPage,
        cursor,
      };

      const result = await client
        .query(query, variablesForPagination)
        .toPromise();
      const resultList = getList(result.data!);

      if (resultList.length < itemsPerPage) {
        hasNextPage.value = false;
      }

      list.value.push(...resultList);
      currentPage.value++;
    } catch (e) {
      error.value = true;
    } finally {
      fetching.value = false;
    }
  };

  onMounted(async () => {
    await fetchNextPage();
  });

  const goToNextPage = async () => {
    if (hasNextPage.value) {
      await fetchNextPage();
    }
  };

  const refetch = async () => {
    currentPage.value = 0;
    hasNextPage.value = true;
    list.value = [];
    await fetchNextPage();
  };

  return {
    fetching,
    error,
    goToNextPage,
    refetch,
    list,
    hasNextPage,
  };
}
