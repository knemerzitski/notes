import { useNavigate, useRouter, ParsedLocation } from '@tanstack/react-router';
import { forwardRef, useEffect, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';

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
function mapSearchQuery(searchQuery: string): string | undefined {
  searchQuery = searchQuery.trim();
  searchQuery = searchQuery.toLowerCase();

  return searchQuery;
}

export const RouteSearchNotesDebounced = forwardRef<
  HTMLDivElement,
  RouteSearchNotesDebouncedProps
>(function RouteSearchNotesDebounced({ wait = 500, options, ...restProps }, ref) {
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const navigate = useNavigate();
  const router = useRouter();

  const [overrideValue, setOverrideValue] = useState<string | null>(null);

  // Cannot use hook useSearch since search field can be visible in other routes
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  useEffect(() => {
    function processLocation(location: ParsedLocation) {
      if (
        location.pathname === '/search' &&
        isObjectLike(location.search) &&
        typeof location.search.q === 'string'
      ) {
        setSearchQuery(location.search.q);
      } else {
        setSearchQuery(null);
      }
    }

    processLocation(router.state.location);

    return router.subscribe('onLoad', ({ toLocation }) => {
      processLocation(toLocation);
    });
  }, [router]);

  const navigateDebounced = useDebouncedCallback<(newSearchQuery: string) => void>(
    (newSearchQuery) => {
      newSearchQuery = mapSearchQuery(newSearchQuery) ?? newSearchQuery;

      void navigate({
        to: '/search',
        search: (prev) => ({
          ...prev,
          q: newSearchQuery,
        }),
      }).then(() => {
        // Clear override if it matches search query
        // Otherwise navigating back will not update search input
        setOverrideValue((prev) => (prev === newSearchQuery ? null : prev));
      });
    },
    wait,
    options
  );

  const value = overrideValue ?? searchQuery ?? '';

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
        disabled: isLocalOnlyUser,
      }}
      IconButtonProps={{
        onClick: handleClickSearch,
        disabled: isLocalOnlyUser,
      }}
      ref={ref}
    />
  );
});
