import { computed, ComputedRef, ref, Ref } from "vue"
import IconDownload from "~icons/lucide/download"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"
import { useToast } from "./toast"
import { useI18n } from "./i18n"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { HoppRESTResponse } from "@helpers/types/HoppRESTResponse"
import { platform } from "~/platform"
import jsonToLanguage from "~/helpers/utils/json-to-language"

export function useCopyInterface(responseBodyText: Ref<string>) {
  const toast = useToast()
  const t = useI18n()

  const copyInterfaceIcon = refAutoReset(IconCopy, 1000)

  const copyInterface = async (targetLanguage: string) => {
    jsonToLanguage(targetLanguage, responseBodyText.value).then((res) => {
      copyToClipboard(res.lines.join("\n"))
      copyInterfaceIcon.value = IconCheck
      toast.success(
        t("state.copied_interface_to_clipboard", { language: targetLanguage })
      )
    })
  }

  return {
    copyInterfaceIcon,
    copyInterface,
  }
}

export function useCopyResponse(responseBodyText: Ref<any>) {
  const toast = useToast()
  const t = useI18n()

  const copyIcon = refAutoReset(IconCopy, 1000)

  const copyResponse = () => {
    copyToClipboard(responseBodyText.value)
    copyIcon.value = IconCheck
    toast.success(`${t("state.copied_to_clipboard")}`)
  }

  return {
    copyIcon,
    copyResponse,
  }
}

export type downloadResponseReturnType = (() => void) | Ref<any>

export function useDownloadResponse(
  contentType: string,
  responseBody: Ref<string | ArrayBuffer>
) {
  const downloadIcon = refAutoReset(IconDownload, 1000)

  const toast = useToast()
  const t = useI18n()

  const downloadResponse = async () => {
    const dataToWrite = responseBody.value

    // Guess extension and filename
    const file = new Blob([dataToWrite], { type: contentType })
    const url = URL.createObjectURL(file)

    const filename = pipe(
      url,
      S.split("/"),
      RNEA.last,
      S.split("#"),
      RNEA.head,
      S.split("?"),
      RNEA.head
    )

    URL.revokeObjectURL(url)

    console.log(filename)

    // TODO: Look at the mime type and determine extension ?
    const result = await platform.io.saveFileWithDialog({
      data: dataToWrite,
      contentType: contentType,
      suggestedFilename: filename,
    })

    // Assume success if unknown as we cannot determine
    if (result.type === "unknown" || result.type === "saved") {
      downloadIcon.value = IconCheck
      toast.success(`${t("state.download_started")}`)
    }
  }

  return {
    downloadIcon,
    downloadResponse,
  }
}

export function usePreview(
  previewEnabledDefault: boolean,
  responseBodyText: Ref<string>
): {
  previewFrame: any
  previewEnabled: Ref<boolean>
  togglePreview: () => void
} {
  const previewFrame = ref<any | null>(null)
  const previewEnabled = ref(previewEnabledDefault)
  const url = ref("")

  const togglePreview = () => {
    previewEnabled.value = !previewEnabled.value
    if (previewEnabled.value) {
      if (previewFrame.value.getAttribute("data-previewing-url") === url.value)
        return
      // Use DOMParser to parse document HTML.
      const previewDocument = new DOMParser().parseFromString(
        responseBodyText.value,
        "text/html"
      )
      // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
      previewDocument.head.innerHTML =
        `<base href="${url.value}">` + previewDocument.head.innerHTML
      // Finally, set the iframe source to the resulting HTML.
      previewFrame.value.srcdoc = previewDocument.documentElement.outerHTML
      previewFrame.value.setAttribute("data-previewing-url", url.value)
    }
  }

  return {
    previewFrame,
    previewEnabled,
    togglePreview,
  }
}

export function useResponseBody(response: HoppRESTResponse): {
  responseBodyText: ComputedRef<string>
} {
  const responseBodyText = computed(() => {
    if (
      response.type === "loading" ||
      response.type === "network_fail" ||
      response.type === "script_fail" ||
      response.type === "fail"
    )
      return ""
    if (typeof response.body === "string") return response.body

    const res = new TextDecoder("utf-8").decode(response.body)
    // HACK: Temporary trailing null character issue from the extension fix
    return res.replace(/\0+$/, "")
  })
  return {
    responseBodyText,
  }
}
