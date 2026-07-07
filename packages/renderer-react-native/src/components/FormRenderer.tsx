import { memo } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaContext } from '../context/MdmaProvider.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

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
  const { dataSources } = useMdmaContext();
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

        const options =
          typeof field.options === 'string'
            ? (dataSources?.[field.options] ?? [])
            : (field.options ?? []);

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
            ) : field.type === 'select' ? (
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
