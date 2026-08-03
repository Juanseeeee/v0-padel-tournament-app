"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type PlayerOption = {
  id: number;
  nombre: string;
  apellido: string;
  localidad?: string | null;
};

interface PlayerSearchSelectProps {
  jugadores: PlayerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Quita acentos y normaliza para una búsqueda tolerante (ej: "jose" encuentra "José")
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const label = (j: PlayerOption) =>
  `${j.apellido} ${j.nombre}${j.localidad ? ` (${j.localidad})` : ""}`;

export function PlayerSearchSelect({
  jugadores,
  value,
  onChange,
  placeholder = "Buscar jugador...",
  disabled,
}: PlayerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Orden alfabético por apellido y luego nombre (locale español)
  const sorted = useMemo(
    () =>
      [...jugadores].sort((a, b) =>
        `${a.apellido} ${a.nombre}`.localeCompare(
          `${b.apellido} ${b.nombre}`,
          "es",
          { sensitivity: "base" }
        )
      ),
    [jugadores]
  );

  // Filtra por cada término escrito (nombre, apellido o localidad, en cualquier orden)
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return sorted;
    const terms = q.split(/\s+/);
    return sorted.filter((j) => {
      const hay = normalize(`${j.nombre} ${j.apellido} ${j.localidad ?? ""}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [sorted, search]);

  const selected = jugadores.find((j) => j.id.toString() === value);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? label(selected) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribí nombre, apellido o localidad..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontraron jugadores.</CommandEmpty>
            <CommandGroup>
              {filtered.map((j) => (
                <CommandItem
                  key={j.id}
                  value={j.id.toString()}
                  onSelect={() => {
                    onChange(j.id.toString());
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === j.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{label(j)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
