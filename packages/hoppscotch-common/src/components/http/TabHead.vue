<template>
  <div
    v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
    :title="tab.document.request.name"
    class="flex items-center truncate px-2"
    @dblclick="emit('open-rename-modal')"
    @contextmenu.prevent="options?.tippy?.show()"
    @click.middle="emit('close-tab')"
  >
    <span
      class="text-tiny font-semibold mr-2"
      :style="{ color: getMethodLabelColorClassOf(tab.document.request) }"
    >
      {{ tab.document.request.method }}
    </span>
    <tippy
      ref="options"
      trigger="manual"
      interactive
      theme="popover"
      :on-shown="() => tippyActions!.focus()"
    >
      <span class="truncate">
        {{ tab.document.request.name }}
      </span>
      <template #content="{ hide }">
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.r="renameAction?.$el.click()"
          @keyup.s="shareRequestAction?.$el.click()"
          @keyup.d="duplicateAction?.$el.click()"
          @keyup.w="closeAction?.$el.click()"
          @keyup.x="closeOthersAction?.$el.click()"
          @keyup.escape="hide()"
        >
          <HoppSmartItem
            ref="renameAction"
            :icon="IconFileEdit"
            :label="t('request.rename')"
            :shortcut="['R']"
            @click="
              () => {
                emit('open-rename-modal')
                hide()
              }
            "
          />
          <HoppSmartItem
            ref="duplicateAction"
            :icon="IconCopy"
            :label="t('tab.duplicate')"
            :shortcut="['D']"
            @click="
              () => {
                emit('duplicate-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            ref="shareRequestAction"
            :icon="IconShare2"
            :label="t('tab.share_tab_request')"
            :shortcut="['S']"
            @click="
              () => {
                emit('share-tab-request')
                hide()
              }
            "
          />
          <HoppSmartItem
            v-if="isRemovable"
            ref="closeAction"
            :icon="IconXCircle"
            :label="t('tab.close')"
            :shortcut="['W']"
            @click="
              () => {
                emit('close-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            v-if="isRemovable"
            ref="closeOthersAction"
            :icon="IconXSquare"
            :label="t('tab.close_others')"
            :shortcut="['X']"
            @click="
              () => {
                emit('close-other-tabs')
                hide()
              }
            "
          />
        </div>
      </template>
    </tippy>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "~/composables/i18n"
import IconXCircle from "~icons/lucide/x-circle"
import IconXSquare from "~icons/lucide/x-square"
import IconFileEdit from "~icons/lucide/file-edit"
import IconCopy from "~icons/lucide/copy"
import IconShare2 from "~icons/lucide/share-2"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"

const t = useI18n()

defineProps<{
  tab: HoppTab<HoppRESTDocument>
  isRemovable: boolean
}>()

const emit = defineEmits<{
  (event: "open-rename-modal"): void
  (event: "close-tab"): void
  (event: "close-other-tabs"): void
  (event: "duplicate-tab"): void
  (event: "share-tab-request"): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)

const renameAction = ref<HTMLButtonElement | null>(null)
const closeAction = ref<HTMLButtonElement | null>(null)
const closeOthersAction = ref<HTMLButtonElement | null>(null)
const duplicateAction = ref<HTMLButtonElement | null>(null)
const shareRequestAction = ref<HTMLButtonElement | null>(null)
</script>
