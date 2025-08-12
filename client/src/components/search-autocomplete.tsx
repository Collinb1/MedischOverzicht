import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MedicalItem } from "@shared/schema";

interface SearchAutocompleteProps {
  items: MedicalItem[];
  value: string;
  onChange: (value: string) => void;
  onEnterPressed?: () => void;
  placeholder?: string;
}

export default function SearchAutocomplete({ 
  items, 
  value, 
  onChange, 
  onEnterPressed,
  placeholder = "Zoek naar items..." 
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions based on search value
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const searchLower = value.toLowerCase();
    const uniqueSuggestions = new Set<string>();

    // Collect suggestions from item names, descriptions, categories, and search terms
    items.forEach(item => {
      // Item name suggestions
      if (item.name.toLowerCase().includes(searchLower)) {
        uniqueSuggestions.add(item.name);
      }

      // Category suggestions
      if (item.category.toLowerCase().includes(searchLower)) {
        uniqueSuggestions.add(item.category);
      }

      // Description suggestions (if exists)
      if (item.description && item.description.toLowerCase().includes(searchLower)) {
        // Add relevant words from description
        const words = item.description.split(' ').filter(word => 
          word.length > 3 && word.toLowerCase().includes(searchLower)
        );
        words.forEach(word => uniqueSuggestions.add(word));
      }

      // Search terms suggestions (if exists)
      if ((item as any).searchTerms) {
        const searchTerms = (item as any).searchTerms.toLowerCase();
        if (searchTerms.includes(searchLower)) {
          // Split search terms and add matching ones
          const terms = searchTerms.split(',').map((term: string) => term.trim());
          terms.forEach((term: string) => {
            if (term.includes(searchLower)) {
              uniqueSuggestions.add(term);
            }
          });
        }
      }
    });

    // Convert to array and limit to 8 suggestions
    const suggestionArray = Array.from(uniqueSuggestions)
      .filter(suggestion => suggestion.toLowerCase() !== searchLower)
      .sort((a, b) => {
        // Prioritize exact matches at the beginning
        const aStartsWith = a.toLowerCase().startsWith(searchLower);
        const bStartsWith = b.toLowerCase().startsWith(searchLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    setSuggestions(suggestionArray);
    setOpen(suggestionArray.length > 0);
  }, [value, items]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setOpen(false);
      onEnterPressed?.();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    setOpen(false);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
              data-testid="input-search"
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                data-testid="button-clear-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty>Geen suggesties gevonden</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer hover:bg-gray-50"
                      data-testid={`suggestion-${index}`}
                    >
                      <Search className="mr-2 h-3 w-3 text-gray-400" />
                      <span className="flex-1">{suggestion}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}