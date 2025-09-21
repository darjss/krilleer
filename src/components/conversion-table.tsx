import { For, createMemo } from "solid-js"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LATIN_TO_CYRILLIC_DISPLAY_MAPPINGS } from "@/lib/transliterate"

export default function ConversionTable() {
    const columns = 3
    const chunked = createMemo(() => {
        const items = LATIN_TO_CYRILLIC_DISPLAY_MAPPINGS
        const perCol = Math.ceil(items.length / columns)
        const chunks = [] as typeof items[]
        for (let i = 0; i < columns; i += 1) {
            const start = i * perCol
            const end = start + perCol
            chunks.push(items.slice(start, end))
        }
        return chunks
    })

    return (
        <Card class="p-0">
            <Collapsible>
                <div class="flex items-center justify-between p-6 border-b-2 border-border bg-secondary/40">
                    <h3 class="text-base font-semibold tracking-tight">Хөрвүүлгийн хүснэгт</h3>
                    <CollapsibleTrigger
                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Toggle conversion table"
                    >
                        Харах / Нуух
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent class="p-4 max-h-[60vh] overflow-y-auto">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <For each={chunked()}>
                            {(group) => (
                                <Table class="w-auto mx-auto table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead class="h-8 px-2 text-xs">Latin</TableHead>
                                            <TableHead class="h-8 px-2 text-xs">Кирилл</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <For each={group}>
                                            {(m) => (
                                                <TableRow>
                                                    <TableCell class="p-1 font-mono text-xs">{m.latin}</TableCell>
                                                    <TableCell class="p-1 font-mono text-xs">{m.cyrillic}</TableCell>
                                                </TableRow>
                                            )}
                                        </For>
                                    </TableBody>
                                </Table>
                            )}
                        </For>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Collapsible>
                <div class="flex items-center justify-between p-4 border-t border-border">
                    <h3 class="text-base font-semibold tracking-tight">Товчлуурын хослолууд</h3>
                    <CollapsibleTrigger
                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Toggle keybinds"
                    >
                        Харах / Нуух
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent class="p-4">
                    <div class="space-y-2">
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-mono">Ctrl + Shift + Z</span>
                            <span>Zen горим руу орох</span>
                        </div>
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-mono">Esc</span>
                            <span>Zen горимоос гарах</span>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}



