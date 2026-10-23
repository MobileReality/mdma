import { isDataDrivenOptions } from '@mobile-reality/mdma-runtime';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useMdmaContext } from '../context/MdmaProvider.js';
import { useDataState, useDocumentStore } from '../hooks/use-document-store.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

function DataDrivenOptions({
  dataKey,
  fieldValue,
  onSelect,
  theme,
}: {
  dataKey: string;
  fieldValue: string;
  onSelect: (value: string) => void;
  theme: ReturnType<typeof useMdmaTheme>;
}) {
  const { colors, spacing, fontSize, radius } = theme;
  const store = useDocumentStore();
  const dataState = useDataState(dataKey);

  if (!dataState || dataState.status === 'loading') {
    return <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>Loading…</Text>;
  }
  if (dataState.status === 'error') {
    return (
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSize.small }}>
          {dataState.error ?? 'Failed to load options'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => store.retryData(dataKey)}>
          <Text style={{ color: colors.primary, fontSize: fontSize.small }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const options = dataState.rows as { label: string; value: string }[];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((opt) => {
        const selected = fieldValue === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : colors.background,
            }}
          >
            <Text
              style={{ color: selected ? colors.onPrimary : colors.text, fontSize: fontSize.body }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type SelectOption = { label: string; value: string };

function inlineOptions(
  options: unknown,
  dataSources: Record<string, SelectOption[]> | undefined,
): SelectOption[] {
  if (typeof options === 'string') return dataSources?.[options] ?? [];
  return Array.isArray(options) ? options : [];
}

function matchesQuery(option: SelectOption, query: string): boolean {
  return option.label.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * A `searchable: true` select. Inline options are filtered here; a data-source
 * slot gets the typed text as its `filter`, so the resolver does the search.
 */
function SearchableSelect({
  dataKey,
  staticOptions,
  label,
  value,
  onChange,
}: {
  dataKey?: string;
  staticOptions: SelectOption[];
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const store = useDocumentStore();
  const dataState = useDataState(dataKey ?? '');
  const [query, setQuery] = useState('');

  // a filter left by an earlier mount would hide options behind an empty input
  useEffect(() => {
    if (dataKey && store.getDataState(dataKey)?.filter) store.setDataFilter(dataKey, undefined);
  }, [dataKey, store]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    if (dataKey) store.setDataFilter(dataKey, next.trim() || undefined);
  };
  const handleChange = (value: string) => {
    onChange(value);
    handleQueryChange('');
  };

  if (!dataKey) {
    return (
      <Combobox
        label={label}
        value={value}
        onChange={handleChange}
        query={query}
        onQueryChange={handleQueryChange}
        options={query ? staticOptions.filter((o) => matchesQuery(o, query)) : staticOptions}
      />
    );
  }

  return (
    <Combobox
      label={label}
      value={value}
      onChange={handleChange}
      query={query}
      onQueryChange={handleQueryChange}
      options={(dataState?.rows ?? []) as SelectOption[]}
      loading={!dataState || dataState.status === 'loading' || dataState.status === 'idle'}
      error={
        dataState?.status === 'error' ? (dataState.error ?? 'Failed to load options') : undefined
      }
      onRetry={() => store.retryData(dataKey)}
    />
  );
}

interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  query: string;
  onQueryChange: (query: string) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

function Combobox({
  value,
  onChange,
  label,
  options,
  query,
  onQueryChange,
  loading,
  error,
  onRetry,
}: ComboboxProps) {
  const { colors, spacing, fontSize, radius } = useMdmaTheme();
  const inputRef = useRef<TextInput>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the picked option may drop out of later search results; keep its label
  const [picked, setPicked] = useState<SelectOption | null>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ??
    (picked?.value === value ? picked.label : value);

  const choose = (option: SelectOption) => {
    setPicked(option);
    setOpen(false);
    setFocused(false);
    onChange(option.value);
    inputRef.current?.blur();
  };

  const cancelClose = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  };
  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );

  const statusStyle = {
    color: colors.textMuted,
    fontSize: fontSize.small,
    padding: spacing.sm,
  } as const;

  return (
    <View style={{ gap: spacing.xs }}>
      <TextInput
        ref={inputRef}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, busy: loading }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Search..."
        placeholderTextColor={colors.textMuted}
        value={focused ? query : selectedLabel}
        onFocus={() => {
          cancelClose();
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          // deferred for hosts whose keyboardShouldPersistTaps lets a press blur the input before it fires
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onChangeText={(text) => {
          setOpen(true);
          onQueryChange(text);
        }}
        style={{
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          color: colors.text,
          backgroundColor: colors.background,
          fontSize: fontSize.body,
        }}
      />
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            backgroundColor: colors.background,
            overflow: 'hidden',
          }}
        >
          {error ? (
            <View style={{ padding: spacing.sm, gap: spacing.xs }}>
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ color: colors.text, fontSize: fontSize.small }}
              >
                {error}
              </Text>
              {onRetry ? (
                <Pressable accessibilityRole="button" onPress={onRetry}>
                  <Text style={{ color: colors.primary, fontSize: fontSize.small }}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ) : loading && options.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={statusStyle}>
              Searching...
            </Text>
          ) : options.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={statusStyle}>
              No matches
            </Text>
          ) : (
            options.map((opt) => {
              const selected = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  // biome-ignore lint/a11y/useSemanticElements: RN role prop, there is no <option> element
                  role="option"
                  accessibilityState={{ selected }}
                  onPress={() => choose(opt)}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.sm,
                    backgroundColor: selected ? colors.primary : colors.background,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.onPrimary : colors.text,
                      fontSize: fontSize.body,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * RN form renderer. Emits the same store actions as the web `FormRenderer`:
 * `FIELD_CHANGED` per field, `ACTION_TRIGGERED` on submit.
 *
 * v1 field coverage: text/number/email/date → `TextInput`; textarea → multiline
 * `TextInput`; checkbox → `Switch`; select → inline option list (no native
 * module needed). `date` and `file` render a plain input/placeholder here — the
 * native date picker / document picker are optional add-ons wired via the
 * `customizations` element slot (see the renderer plan, Q3/Q7).
 */
export const FormRenderer = memo(function FormRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const { dataSources, store } = useMdmaContext();
  const theme = useMdmaTheme();
  const { colors, spacing, fontSize, radius } = theme;

  if (component.type !== 'form') return null;

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: fontSize.body,
  } as const;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginVertical: spacing.sm,
        gap: spacing.sm,
      }}
    >
      {component.label ? (
        <Text style={{ fontSize: fontSize.title, fontWeight: '700', color: colors.text }}>
          {component.label}
        </Text>
      ) : null}

      {component.fields.map((field) => {
        const fieldValue = String(componentState?.values[field.name] ?? '');
        const handleChange = (value: unknown) =>
          dispatch({ type: 'FIELD_CHANGED', componentId: component.id, field: field.name, value });

        const dataKey = `${component.id}.${field.name}`;
        const isDataDriven = isDataDrivenOptions(field.options, dataKey, (key) =>
          store.getDataState(key),
        );
        const options = inlineOptions(field.options, dataSources);

        return (
          <View key={field.name} style={{ gap: spacing.xs }}>
            <Text style={{ fontSize: fontSize.label, color: colors.text }}>
              {field.label}
              {field.sensitive ? ' 🔒' : ''}
            </Text>

            {field.type === 'checkbox' ? (
              <Switch
                value={Boolean(componentState?.values[field.name])}
                onValueChange={(checked) => handleChange(checked)}
                accessibilityLabel={field.label}
              />
            ) : field.type === 'select' && field.searchable ? (
              <SearchableSelect
                dataKey={isDataDriven ? dataKey : undefined}
                staticOptions={options}
                label={field.label}
                value={fieldValue}
                onChange={handleChange}
              />
            ) : field.type === 'select' ? (
              isDataDriven ? (
                <DataDrivenOptions
                  dataKey={dataKey}
                  fieldValue={fieldValue}
                  onSelect={handleChange}
                  theme={theme}
                />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {options.map((opt) => {
                    const selected = fieldValue === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => handleChange(opt.value)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: radius.sm,
                          borderWidth: 1,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : colors.background,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? colors.onPrimary : colors.text,
                            fontSize: fontSize.body,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : field.type === 'textarea' ? (
              <TextInput
                multiline
                numberOfLines={4}
                value={fieldValue}
                onChangeText={handleChange}
                secureTextEntry={field.sensitive}
                placeholderTextColor={colors.textMuted}
                style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
              />
            ) : (
              <TextInput
                value={fieldValue}
                onChangeText={handleChange}
                secureTextEntry={field.sensitive}
                keyboardType={
                  field.type === 'number'
                    ? 'numeric'
                    : field.type === 'email'
                      ? 'email-address'
                      : 'default'
                }
                autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            )}
          </View>
        );
      })}

      {component.onSubmit ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            dispatch({
              type: 'ACTION_TRIGGERED',
              componentId: component.id,
              actionId: component.onSubmit,
            })
          }
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.sm,
            paddingVertical: spacing.sm,
            alignItems: 'center',
            marginTop: spacing.xs,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: fontSize.body }}>
            Submit
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});
