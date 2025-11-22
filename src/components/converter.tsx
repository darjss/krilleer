import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { transliterateLatinToCyrillic, reverseTransliterateCyrillicToLatin, applyTransliteration } from "@/lib/transliterate"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { createSignal, createEffect, Switch, Match } from "solid-js"
import { TextField, TextFieldTextArea as TextArea } from "./ui/text-field"

// Simple icons as SVGs to avoid dependencies if lucide-solid is not available, 
// or we can use the ones from the project if available. 
// For now, I'll embed SVGs for reliability.
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
const PasteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
const MaximizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const PowerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>

declare const posthog: any

export default function Converter() {
    const [inputText, setInputText] = useLocalStorage("inputText", "")
    const [copied, setCopied] = createSignal(false)
    const [zenMode, setZenMode] = useLocalStorage("zenMode", false)
    const [converterEnabled, setConverterEnabled] = useLocalStorage("converterEnabled", true)
    let textareaRef: HTMLTextAreaElement | undefined

    createEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && zenMode()) {
                setZenMode(false)
                e.preventDefault()
            } else if (e.ctrlKey && e.shiftKey && e.key === "z" && !zenMode()) {
                setZenMode(true)
                e.preventDefault()
            } else if (e.ctrlKey && e.shiftKey && (e.key === "x" || e.key === "X")) {
                setConverterEnabled(!converterEnabled())
                e.preventDefault()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    })

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inputText())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            try { posthog?.capture?.('copy_text', { length: inputText().length }) } catch {}
        } catch (err) {
            console.error("Failed to copy text: ", err)
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            
            let newValue = text
            if (converterEnabled()) {
                newValue = applyTransliteration(text)
            }
            
            if (textareaRef) {
                const cursorPos = textareaRef.selectionStart
                const currentValue = textareaRef.value
                const nextValue = currentValue.slice(0, cursorPos) + newValue + currentValue.slice(textareaRef.selectionEnd)
                textareaRef.value = nextValue
                textareaRef.selectionStart = textareaRef.selectionEnd = cursorPos + newValue.length
                setInputText(nextValue)
            } else {
                setInputText(newValue)
            }
            try { posthog?.capture?.('paste_text', { length: text.length }) } catch {}
        } catch (err) {
            console.error("Failed to paste text: ", err)
        }
    }

    const handleClear = () => {
        setInputText("")
        try { posthog?.capture?.('clear_text') } catch {}
    }

    const handleZenMode = () => {
        setZenMode(!zenMode())
    }

    const handleToggleConverter = () => {
        setConverterEnabled(!converterEnabled())
    }

    const handleInput = (e: InputEvent) => {
        const textarea = e.currentTarget as HTMLTextAreaElement
        const cursorPos = textarea.selectionStart
        const raw = textarea.value
        
        if (converterEnabled()) {
            // Find the word boundaries around the cursor
            // We look backwards from cursor for space/newline/start
            // We look forwards from cursor for space/newline/end
            
            // Note: The character causing the input event is already in `raw` at `cursorPos - 1` (usually)
            // But for general robustness, we just find the contiguous non-whitespace block around the cursor.
            
            const isSeparator = (char: string) => /[\s\n\t.,;!?(){}[\]"']/.test(char)
            
            let start = cursorPos - 1
            while (start >= 0 && !isSeparator(raw[start])) {
                start--
            }
            start++ // Move back to the first character of the word
            
            let end = cursorPos
            while (end < raw.length && !isSeparator(raw[end])) {
                end++
            }
            
            // If we are just typing a separator, we might not want to re-transliterate the previous word repeatedly
            // But usually it's fine. However, if the cursor is AT a separator, `start` might equal `end` (empty word).
            
            if (start < end) {
                const word = raw.slice(start, end)
                const transliteratedWord = applyTransliteration(word)
                
                if (word !== transliteratedWord) {
                    const before = raw.slice(0, start)
                    const after = raw.slice(end)
                    
                    const newText = before + transliteratedWord + after
                    
                    // Calculate new cursor position
                    // We want to keep the cursor relative to the end of the word, or proportional?
                    // Simplest is to put it at the end of the transliterated word if we were at the end,
                    // or try to maintain relative offset.
                    // Since Cyrillic mapping is mostly 1-to-1 or 2-to-1, relative offset is tricky.
                    // Let's try to keep it at the same relative distance from the START of the word.
                    const offsetInWord = cursorPos - start
                    // But the word length might have changed.
                    // If we are appending, we want to be at the end.
                    
                    const newCursorPos = start + transliteratedWord.length - (word.length - offsetInWord)
                    // Wait, if word became shorter/longer, we need to adjust.
                    // If I typed 'sh' (cursor at 2) -> 'ш' (length 1). Cursor should be at 1.
                    // start=0, end=2. word='sh'. trans='ш'. offsetInWord=2.
                    // newCursorPos = 0 + 1 - (2 - 2) = 1. Correct.
                    
                    // If I type inside: 's|h' -> 'ш'. Cursor?
                    // 's' (cursor 1) -> 'с'. Type 'h'. 'сh' (cursor 2).
                    // start=0, end=2. word='сh'. trans='ш'. offsetInWord=2.
                    // newCursorPos = 0 + 1 - 0 = 1. Correct.
                    
                    setInputText(newText)
                    textarea.value = newText
                    textarea.selectionStart = textarea.selectionEnd = Math.max(start, Math.min(newCursorPos, start + transliteratedWord.length))
                } else {
                     setInputText(raw)
                }
            } else {
                setInputText(raw)
            }
            
            try { posthog?.capture?.('input_changed', { length: raw.length }) } catch {}
        } else {
            setInputText(raw)
            try { posthog?.capture?.('input_changed', { length: raw.length }) } catch {}
        }
    }


    return (
        <Switch>
            <Match when={zenMode()}>
                <div class="fixed inset-0 z-50 bg-background flex flex-col">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-border/40">
                         <h2 class="text-lg font-semibold text-muted-foreground">Zen Mode</h2>
                        <Button variant="ghost" size="sm" onClick={() => setZenMode(false)} class="gap-2">
                            Гарах (Esc)
                        </Button>
                    </div>
                    <div class="flex-1 p-6 max-w-5xl mx-auto w-full">
                        <TextField class="h-full">
                            <TextArea
                                placeholder="Латин үсгээр бичихэд шууд кирилл рүү хөрвөнө..."
                                value={inputText()}
                                onInput={handleInput}
                                class="w-full h-full resize-none text-lg sm:text-xl leading-relaxed p-0 border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
                                autofocus
                                ref={textareaRef}
                            />
                        </TextField>
                    </div>
                </div>
            </Match>
            <Match when={!zenMode()}>
                <Card class="overflow-hidden border-border/50 shadow-xl shadow-primary/5 bg-background/60 backdrop-blur-sm">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 sm:px-4 sm:py-3 border-b border-border/40 bg-muted/30">
                        <div class="flex items-center gap-2">
                            <div class="flex gap-1">
                                <div class="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div class="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                                <div class="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                            <span class="text-xs font-medium text-muted-foreground ml-2">Редактор</span>
                            <div class="w-px h-4 bg-border mx-1"></div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleToggleConverter} 
                                class={`h-6 px-2 text-[10px] uppercase tracking-wider font-medium gap-1.5 transition-colors ${converterEnabled() ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                title={converterEnabled() ? "Хөрвүүлэгч асаалттай (Ctrl+Shift+X)" : "Хөрвүүлэгч унтраалттай (Ctrl+Shift+X)"}
                            >
                                <div class={`w-1.5 h-1.5 rounded-full ${converterEnabled() ? 'bg-green-500' : 'bg-muted-foreground'}`}></div>
                                {converterEnabled() ? "ON" : "OFF"}
                            </Button>
                        </div>
                        
                        <div class="flex flex-wrap gap-1">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCopy} 
                                class="h-8 px-2 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                {copied() ? <CheckIcon /> : <CopyIcon />}
                                {copied() ? "Хуулагдлаа" : "Хуулах"}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handlePaste} 
                                class="h-8 px-2 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <PasteIcon />
                                Буулгах
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClear} 
                                class="h-8 px-2 text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <TrashIcon />
                                Цэвэрлэх
                            </Button>

                            <div class="w-px h-4 bg-border mx-1 self-center hidden sm:block"></div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleZenMode} 
                                class="h-8 px-2 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Томруулах (Ctrl+Shift+Z)"
                            >
                                <MaximizeIcon />
                                <span class="sr-only sm:not-sr-only">Томруулах</span>
                            </Button>
                        </div>
                    </div>
                    
                    <div class="relative">
                        <TextField>
                            <TextArea
                                placeholder="Энд латин үсгээр бичээд үз дээ..."
                                value={inputText()}
                                onInput={handleInput}
                                class="min-h-[300px] w-full resize-none text-base sm:text-lg leading-relaxed p-6 border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/40 selection:bg-primary/20"
                                ref={textareaRef}
                            />
                        </TextField>
                        
                        <div class="absolute bottom-4 right-6 text-xs text-muted-foreground/60 pointer-events-none">
                            {inputText().split(" ").length} үг
                        </div>
                    </div>
                </Card>
            </Match>
        </Switch>
    )
}