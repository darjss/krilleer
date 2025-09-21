import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { transliterateLatinToCyrillic, reverseTransliterateCyrillicToLatin } from "@/lib/transliterate"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { createSignal, createEffect, Switch, Match } from "solid-js"
import { Check } from "./ui/icons/check"
import { Copy } from "./ui/icons/copy"
import { TextField, TextFieldTextArea as TextArea } from "./ui/text-field"

export default function Converter() {
    const [inputText, setInputText] = useLocalStorage("inputText", "")
    const [copied, setCopied] = createSignal(false)
    const [zenMode, setZenMode] = useLocalStorage("zenMode", false)

    createEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && zenMode()) {
                setZenMode(false)
                e.preventDefault()
            } else if (e.ctrlKey && e.shiftKey && e.key === "z" && !zenMode()) {
                setZenMode(true)
                e.preventDefault()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    })

    // Single-textarea mode: we store/show Cyrillic directly

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inputText())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy text: ", err)
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const asLatin = reverseTransliterateCyrillicToLatin(text)
            setInputText(transliterateLatinToCyrillic(asLatin, { preserveCase: true }))
        } catch (err) {
            console.error("Failed to paste text: ", err)
        }
    }

    const handleClear = () => {
        setInputText("")
    }
    console.log(zenMode())
    const handleZenMode = () => {
        console.log("pressed", zenMode())
        setZenMode(!zenMode())
    }

    const handleInput = (e: InputEvent) => {
        const textarea = e.currentTarget as HTMLTextAreaElement
        const cursorPos = textarea.selectionStart
        const raw = textarea.value
        const asLatin = reverseTransliterateCyrillicToLatin(raw)
        const asCyr = transliterateLatinToCyrillic(asLatin, { preserveCase: true })
        setInputText(asCyr)
        setTimeout(() => {
            textarea.selectionStart = cursorPos
            textarea.selectionEnd = cursorPos
        }, 0)
    }


    return (
        <Switch>
            <Match when={zenMode()}>
                <div class="fixed inset-0 z-50 bg-background pt-16 p-6">
                    <TextField class="h-full">
                        <TextArea
                            placeholder="Латин үсгээр бичихэд шууд кирилл рүү хөрвөнө..."
                            value={inputText()}
                            onInput={handleInput}
                            class="w-full h-full resize-none text-base leading-relaxed"
                            autofocus
                        />
                    </TextField>
                </div>
            </Match>
            <Match when={!zenMode()}>
                <Card class="p-0">
                    <div class="flex items-center justify-between p-6 border-b-2 border-border bg-secondary/40">
                        <h2 class="text-lg font-bold tracking-tight">Латин текст оруулна уу</h2>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCopy} class="text-xs">
                                Хуулах
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePaste} class="text-xs">
                                Буулгах
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClear} class="text-xs">
                                Арилгах
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleZenMode} class="text-xs">
                                Zen
                            </Button>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <TextField>
                            <TextArea
                                placeholder="Латин үсгээр бичихэд шууд кирилл рүү хөрвөнө..."
                                value={inputText()}
                                onInput={handleInput}
                                class="min-h-[220px] resize-none text-base leading-relaxed"
                            />
                        </TextField>
                    </div>
                </Card>
            </Match>
        </Switch>
    )
}