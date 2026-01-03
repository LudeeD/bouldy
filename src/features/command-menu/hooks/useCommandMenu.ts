import { useState, useMemo, useCallback, useEffect } from "react";
import { Command } from "../types/command";

export interface UseCommandMenuReturn {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  filteredCommands: Command[];
  openMenu: () => void;
  closeMenu: () => void;
  setSearchQuery: (query: string) => void;
  selectIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
}

export function useCommandMenu(commands: Command[]): UseCommandMenuReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter((command) => {
      const titleMatch = command.title.toLowerCase().includes(query);
      const descriptionMatch = command.description?.toLowerCase().includes(query);
      const keywordsMatch = command.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(query)
      );
      const categoryMatch = command.category.toLowerCase().includes(query);

      return titleMatch || descriptionMatch || keywordsMatch || categoryMatch;
    });
  }, [commands, searchQuery]);

  // Reset selected index when search query changes (not when filtered commands change)
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Reset search and selection when menu closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => {
      const length = filteredCommands.length;
      if (length === 0) return 0;
      return (prev + 1) % length;
    });
  }, [filteredCommands.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => {
      const length = filteredCommands.length;
      if (length === 0) return 0;
      return (prev - 1 + length) % length;
    });
  }, [filteredCommands.length]);

  const executeSelected = useCallback(() => {
    const command = filteredCommands[selectedIndex];
    if (command) {
      command.action();
      closeMenu();
    }
  }, [filteredCommands, selectedIndex, closeMenu]);

  return {
    isOpen,
    searchQuery,
    selectedIndex,
    filteredCommands,
    openMenu,
    closeMenu,
    setSearchQuery,
    selectIndex,
    selectNext,
    selectPrevious,
    executeSelected,
  };
}
