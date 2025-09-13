'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query" // Il nostro hook per la responsività

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer" // Importiamo il Drawer
import type { ExerciseSearchResult } from "@/app/api/search-exercises/route"

interface ExerciseSearchComboboxProps {
  value: string;
  onSelect: (value: string) => void;
}

export function ExerciseSearchCombobox({ value, onSelect }: ExerciseSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)") // Usiamo il nostro hook

  if (isDesktop) {
    // Versione Desktop con Popover
    return <PopoverCombobox value={value} onSelect={onSelect} open={open} setOpen={setOpen} />
  }

  // Versione Mobile con Drawer
  return <DrawerCombobox value={value} onSelect={onSelect} open={open} setOpen={setOpen} />
}

// Componente interno per il Popover (Desktop)
function PopoverCombobox({ value, onSelect, open, setOpen }: ExerciseSearchComboboxProps & { open: boolean, setOpen: (open: boolean) => void }) {
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {value || "Seleziona esercizio..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <ExerciseSearchContent value={value} onSelect={onSelect} setOpen={setOpen} />
            </PopoverContent>
        </Popover>
    )
}

// Componente interno per il Drawer (Mobile)
function DrawerCombobox({ value, onSelect, open, setOpen }: ExerciseSearchComboboxProps & { open: boolean, setOpen: (open: boolean) => void }) {
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {value || "Seleziona esercizio..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                {/* --- LA CORREZIONE È QUI --- */}
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Selezione Esercizio</DrawerTitle>
                  <DrawerDescription>
                    Cerca e seleziona un esercizio dalla lista.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="mt-4 border-t">
                    <ExerciseSearchContent value={value} onSelect={onSelect} setOpen={setOpen} />
                </div>
            </DrawerContent>
        </Drawer>
    )
}

// Componente condiviso per il contenuto della ricerca
function ExerciseSearchContent({ value, onSelect, setOpen }: ExerciseSearchComboboxProps & { setOpen: (open: boolean) => void }) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [results, setResults] = React.useState<ExerciseSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 1) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/search-exercises?term=${searchTerm}`);
          const data = await response.json();
          if (Array.isArray(data)) setResults(data);
          else setResults([]);
        } catch (error) {
          console.error("Failed to fetch exercises:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const handleSelect = (currentValue: string) => {
    onSelect(currentValue)
    setSearchTerm("")
    setOpen(false)
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Cerca esercizio..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList>
        {isLoading && <div className="p-2 text-sm text-center">Caricamento...</div>}
        {!isLoading && results.length === 0 && searchTerm.length > 1 && <div className="p-2 text-sm text-center">Nessun risultato.</div>}
        <CommandGroup>
          {/* CORREZIONE DELLA KEY */}
          {results.map((exercise, index) => (
            <CommandItem
              key={`${exercise.id}-${index}`} // Usiamo una combinazione per una key più sicura
              value={exercise.name}
              onSelect={handleSelect}
            >
              <Check className={cn("mr-2 h-4 w-4", value === exercise.name ? "opacity-100" : "opacity-0")} />
              <div>
                <p>{exercise.name}</p>
                <p className="text-xs text-muted-foreground">{exercise.category}</p>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}