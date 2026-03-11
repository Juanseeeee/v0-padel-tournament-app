
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import useSWRInfinite from "swr/infinite"
import useSWR from "swr"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Jugador } from "@/lib/db"

interface PlayerComboboxProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  excludeIds?: number[]
  categoryId?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PlayerCombobox({ value, onChange, disabled, excludeIds = [], categoryId }: PlayerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  // Use SWR Infinite for pagination
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.jugadores.length) return null // reached the end
    return `/api/admin/jugadores?q=${search}&limit=10&offset=${pageIndex * 10}`
  }

  const { data, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher)
  
  const players: Jugador[] = data ? data.flatMap(page => page.jugadores) : []
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined")
  const isEmpty = data?.[0]?.jugadores?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.jugadores?.length < 10)

  // Selected player fetch if not in list
  const { data: selectedPlayerData } = useSWR(
    value ? `/api/admin/jugadores/${value}` : null,
    fetcher
  )
  
  // If the selected player is in the current list, use it, otherwise use the fetched one
  const selectedPlayer = players.find((p) => p.id.toString() === value) || selectedPlayerData?.jugador

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedPlayer
            ? `${selectedPlayer.nombre} ${selectedPlayer.apellido} (${selectedPlayer.usuario_dni || 'S/DNI'})`
            : "Seleccionar jugador..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar por nombre o DNI..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && players.length === 0 && (
              <div className="p-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
            {!isLoading && players.length === 0 && (
              <CommandEmpty>No se encontraron jugadores.</CommandEmpty>
            )}
            <CommandGroup>
              {players.map((player) => {
                const isExcluded = excludeIds.includes(player.id)
                if (isExcluded) return null

                return (
                  <CommandItem
                    key={player.id}
                    value={player.id.toString()}
                    onSelect={() => {
                      onChange(player.id.toString())
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === player.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{player.nombre} {player.apellido}</span>
                      <span className="text-xs text-muted-foreground">
                        DNI: {player.usuario_dni || 'N/A'} • Cat: {player.categoria_nombre || 'N/A'}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
              {!isLoading && !isReachingEnd && (
                 <CommandItem
                    onSelect={() => setSize(size + 1)}
                    className="justify-center text-center text-muted-foreground cursor-pointer"
                 >
                    {isLoadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        "Cargar más..."
                    )}
                 </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
