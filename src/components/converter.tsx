import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { transliterateLatinToCyrillic } from "@/lib/transliterate"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { createMemo, createSignal } from "solid-js"
import { Check } from "./ui/icons/check"
import { Copy } from "./ui/icons/copy"
import { TextField, TextFieldTextArea as TextArea } from "./ui/text-field"

export default function Converter() {
    const [inputText, setInputText] = useLocalStorage("inputText", "")
    const [copied, setCopied] = createSignal(false)

    const convertedText = createMemo(() => {
        const text = inputText()
        if (!text) return ""
        return transliterateLatinToCyrillic(text, { preserveCase: true })
    })

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(convertedText())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy text: ", err)
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setInputText(text)
        } catch (err) {
            console.error("Failed to paste text: ", err)
        }
    }

    const handleClear = () => {
        setInputText("")
    }

    return (
        <Card class="p-0">
            <div class="flex items-center justify-between p-6 border-b-2 border-border bg-secondary/40">
                <h2 class="text-lg font-bold tracking-tight">Латин текст оруулна уу</h2>
                <div class="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePaste} class="text-xs">
                        Буулгах
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClear} class="text-xs">
                        Арилгах
                    </Button>
                </div>
            </div>
            <div class="p-6 space-y-4">
                <TextField>
                    <TextArea
                        placeholder="Латин үсгээр монгол текст энд бичнэ үү..."
                        value={inputText()}
                        onInput={(e) => setInputText(e.currentTarget.value)}
                        class="min-h-[220px] resize-none text-base leading-relaxed"
                    />
                </TextField>

                {convertedText() && (
                    <div class="space-y-2">
                        <h3 class="text-sm font-semibold text-foreground/80">Кирилл хөрвүүлсэн үр дүн</h3>
                        <div class="relative">
                            <div class="p-4 bg-muted border-2 border-input text-base leading-relaxed min-h-[120px] pr-20 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
                                {convertedText()}
                            </div>
                            <div class="absolute right-2 top-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                    class="text-xs"
                                >
                                    {copied() ? (
                                        <>
                                            <Check />
                                            Хуулсан
                                        </>
                                    ) : (
                                        <>
                                            <Copy />
                                            Хуулах
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}