<template>
  <div class="flex flex-col">
    <h1 class="text-lg font-bold text-secondaryDark">{{ t('teams.teams') }}</h1>

    <div class="flex flex-col">
      <div class="flex py-10">
        <HoppButtonPrimary
          :icon="IconAddUsers"
          :label="t('teams.create_team')"
          @click="showCreateTeamModal = true"
        />
      </div>

      <div class="overflow-x-auto">
        <div v-if="fetching" class="flex justify-center">
          <HoppSmartSpinner />
        </div>

        <div v-else-if="error">{{ t('teams.load_list_error') }}</div>

        <HoppSmartTable v-else-if="teamsList.length" :list="teamsList">
          <template #head>
            <tr
              class="text-secondary border-b border-dividerDark text-sm text-left bg-primaryLight"
            >
              <th class="px-6 py-2">{{ t('teams.id') }}</th>
              <th class="px-6 py-2">{{ t('teams.name') }}</th>
              <th class="px-6 py-2">{{ t('teams.members') }}</th>
              <!-- Empty Heading for the Action Button -->
              <th class="px-6 py-2"></th>
            </tr>
          </template>
          <template #body="{ list }">
            <tr
              v-for="team in list"
              :key="team.id"
              class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
              @click="goToTeamDetails(team.id)"
            >
              <td class="flex py-4 px-7 max-w-[16rem]">
                <span class="truncate">
                  {{ team.id }}
                </span>
              </td>

              <td class="py-4 px-7 min-w-[20rem]">
                <span
                  class="flex items-center truncate"
                  :class="{ truncate: team.name }"
                >
                  {{ team.name ?? t('teams.unnamed') }}
                </span>
              </td>

              <td class="py-4 px-7">
                {{ team.members?.length }}
              </td>

              <td @click.stop>
                <div class="relative">
                  <tippy interactive trigger="click" theme="popover">
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :icon="IconMoreHorizontal"
                    />
                    <template #content="{ hide }">
                      <div
                        ref="tippyActions"
                        class="flex flex-col focus:outline-none"
                        tabindex="0"
                        @keyup.escape="hide()"
                      >
                        <HoppSmartItem
                          :icon="IconTrash"
                          :label="t('teams.delete_team')"
                          class="!hover:bg-red-600 w-full"
                          @click="
                            () => {
                              deleteTeam(team.id);
                              hide();
                            }
                          "
                        />
                      </div>
                    </template>
                  </tippy>
                </div>
              </td>
            </tr>
          </template>
        </HoppSmartTable>

        <div v-else class="px-2 text-lg">
          {{ t('teams.no_teams') }}
        </div>

        <div
          v-if="hasNextPage && teamsList.length >= teamsPerPage"
          class="flex justify-center my-5 px-3 py-2 cursor-pointer font-semibold rounded-3xl bg-dividerDark hover:bg-divider transition mx-auto w-38 text-secondaryDark"
          @click="fetchNextTeams"
        >
          <span>{{ t('teams.show_more') }}</span>
          <icon-lucide-chevron-down class="ml-2 text-lg" />
        </div>
      </div>
    </div>
  </div>

  <TeamsAdd
    :show="showCreateTeamModal"
    :allUsersEmail="allUsersEmail"
    :loading-state="createTeamLoading"
    @hide-modal="showCreateTeamModal = false"
    @create-team="createTeam"
  />
  <HoppSmartConfirmModal
    :show="confirmDeletion"
    :title="t('teams.confirm_team_deletion')"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteTeamMutation(deleteTeamID)"
  />
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import {
  CreateTeamDocument,
  MetricsDocument,
  RemoveTeamDocument,
  TeamListDocument,
  UsersListDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '~/composables/usePagedQuery';
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery } from '@urql/vue';
import { useToast } from '~/composables/toast';
import IconAddUsers from '~icons/lucide/plus';
import IconTrash from '~icons/lucide/trash';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();
// Get Users List
const { data } = useQuery({ query: MetricsDocument });
const usersPerPage = computed(() => data.value?.infra.usersCount || 10000);

const { list: usersList } = usePagedQuery(
  UsersListDocument,
  (x) => x.infra.allUsers,
  (x) => x.uid,
  usersPerPage.value,
  { cursor: undefined, take: usersPerPage.value }
);

const allUsersEmail = computed(() => usersList.value.map((user) => user.email));

// Get Paginated Results of all the teams in the infra
const teamsPerPage = 20;
const {
  fetching,
  error,
  goToNextPage: fetchNextTeams,
  refetch,
  list: teamsList,
  hasNextPage,
} = usePagedQuery(
  TeamListDocument,
  (x) => x.infra.allTeams,
  (x) => x.id,
  teamsPerPage,
  { cursor: undefined, take: teamsPerPage }
);

// Create Team
const createTeamMutation = useMutation(CreateTeamDocument);
const showCreateTeamModal = ref(false);
const createTeamLoading = ref(false);

const createTeam = async (newTeamName: string, ownerEmail: string) => {
  if (newTeamName.length < 6) {
    toast.error(`${t('state.team_name_long')}`);
    return;
  }
  if (ownerEmail.length === 0) {
    toast.error(`${t('state.enter_team_email')}`);
    return;
  }
  createTeamLoading.value = true;
  const userUid =
    usersList.value.find((user) => user.email === ownerEmail)?.uid || '';
  const variables = { name: newTeamName.trim(), userUid: userUid };
  await createTeamMutation.executeMutation(variables).then((result) => {
    if (result.error) {
      if (result.error.toString() == '[GraphQL] user/not_found') {
        toast.error(`${t('state.user_not_found')}`);
      } else {
        toast.error(`${t('state.create_team_failure')}`);
      }
      createTeamLoading.value = false;
    } else {
      toast.success(`${t('state.create_team_success')}`);
      showCreateTeamModal.value = false;
      createTeamLoading.value = false;
      refetch();
    }
  });
};

// Go To Individual Team Details Page
const router = useRouter();
const goToTeamDetails = (teamId: string) => router.push('/teams/' + teamId);

// Reload Teams Page when routed back to the teams page
const route = useRoute();
watch(
  () => route.params.id,
  () => window.location.reload()
);

// Team Deletion
const teamDeletion = useMutation(RemoveTeamDocument);
const confirmDeletion = ref(false);
const deleteTeamID = ref<string | null>(null);

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(`${t('state.delete_team_failure')}`);
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.delete_team_failure')}`);
    } else {
      teamsList.value = teamsList.value.filter((team) => team.id !== id);
      toast.success(`${t('state.delete_team_success')}`);
    }
  });
  confirmDeletion.value = false;
  deleteTeamID.value = null;
  router.push('/teams');
};
</script>
