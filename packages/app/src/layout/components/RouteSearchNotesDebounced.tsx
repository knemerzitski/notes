import { useNavigate, useRouter, ParsedLocation } from '@tanstack/react-router';
import { forwardRef, useEffect, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { SearchNoteProps, SearchNotes } from './SearchNotes';

type RouteSearchNotesDebouncedProps = Omit<SearchNoteProps, 'InputBaseProps'> & {
  InputBaseProps?: Omit<SearchNoteProps['InputBaseProps'], 'value' | 'onInput'>;
} & {
  /**
   * @default 500 milliseconds
   */
  wait?: number;
  options?: Options;
};

/**
 * Modify search query before it's sent to location
 */
function mapSearchQuery(searchText: string): string | undefined {
  searchText = searchText.trim();
  searchText = searchText.toLowerCase();

  return searchText;
}

export const RouteSearchNotesDebounced = forwardRef<
  HTMLDivElement,
  RouteSearchNotesDebouncedProps
>(function RouteSearchNotesDebounced({ wait = 500, options, ...restProps }, ref) {
  const navigate = useNavigate();
  const router = useRouter();

  const [overrideValue, setOverrideValue] = useState<string | null>(null);

  // Cannot use hook useSearch since search field can be visible in other routes
  const [searchText, setSearchText] = useState<string | null>(null);

  useEffect(() => {
    function processLocation(location: ParsedLocation) {
      if (
        location.pathname === '/search' &&
        isObjectLike(location.search) &&
        typeof location.search.text === 'string'
      ) {
        setSearchText(location.search.text);
      } else {
        setSearchText(null);
      }
    }

    processLocation(router.state.location);

    return router.subscribe('onLoad', ({ toLocation }) => {
      processLocation(toLocation);
    });
  }, [router]);

  const navigateDebounced = useDebouncedCallback<(newSearchText: string) => void>(
    (newSearchText) => {
      newSearchText = mapSearchQuery(newSearchText) ?? newSearchText;

      void navigate({
        to: '/search',
        search: (prev) => ({
          ...prev,
          text: newSearchText,
        }),
      }).then(() => {
        // Clear override if it matches search query
        // Otherwise navigating back will not update search input
        setOverrideValue((prev) => (prev === newSearchText ? null : prev));
      });
    },
    wait,
    options
  );

  const value = overrideValue ?? searchText ?? '';

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }

    const newSearchQuery = e.target.value;

    // Use local state for immediate value feedback
    setOverrideValue(newSearchQuery);

    navigateDebounced(newSearchQuery);
  }

  function handleClickSearch() {
    navigateDebounced.flush();
  }

  return (
    <SearchNotes
      {...restProps}
      InputBaseProps={{
        value,
        onInput: handleInput,
      }}
      IconButtonProps={{
        onClick: handleClickSearch,
      }}
      ref={ref}
    />
  );
});
