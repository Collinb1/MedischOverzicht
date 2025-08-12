import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Generate suggestions based on search value
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchLower = value.toLowerCase();
    const uniqueSuggestions = new Set<string>();

    // Collect suggestions from item names, categories, and search terms
    items.forEach(item => {
      // Item name suggestions
      if (item.name.toLowerCase().includes(searchLower) && item.name.toLowerCase() !== searchLower) {
        uniqueSuggestions.add(item.name);
      }

      // Category suggestions
      if (item.category.toLowerCase().includes(searchLower) && item.category.toLowerCase() !== searchLower) {
        uniqueSuggestions.add(item.category);
      }

      // Search terms suggestions (if exists)
      if ((item as any).searchTerms) {
        const searchTerms = (item as any).searchTerms.toLowerCase();
        const terms = searchTerms.split(',').map((term: string) => term.trim());
        terms.forEach((term: string) => {
          if (term.includes(searchLower) && term !== searchLower && term.length > 1) {
            uniqueSuggestions.add(term);
          }
        });
      }
    });

    // Convert to array and limit to 6 suggestions
    const suggestionArray = Array.from(uniqueSuggestions)
      .sort((a, b) => {
        // Prioritize exact matches at the beginning
        const aStartsWith = a.toLowerCase().startsWith(searchLower);
        const bStartsWith = b.toLowerCase().startsWith(searchLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 6);

    setSuggestions(suggestionArray);
    setShowSuggestions(suggestionArray.length > 0);
    setSelectedIndex(-1);
  }, [value, items]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        onChange(suggestions[selectedIndex]);
        setShowSuggestions(false);
      } else {
        setShowSuggestions(false);
        onEnterPressed?.();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              ref={el => suggestionRefs.current[index] = el}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center ${
                selectedIndex === index ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
              data-testid={`suggestion-${index}`}
            >
              <Search className="mr-2 h-3 w-3 text-gray-400" />
              <span className="flex-1 text-sm">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}